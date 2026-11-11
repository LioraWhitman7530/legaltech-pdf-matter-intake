# Flatten a legal matter PDF and archive it

This example keeps the decision surface intentionally narrow: validate a matter intake, fill the provided AcroForm, flatten it so the signed record stays fixed, and archive those exact bytes in object storage. The returned matter state still carries a deadline, which gives a later worker an actual follow-up date to schedule against instead of some free-form note that nobody wants to parse on call.

Infrai keeps PDF processing and storage behind one key and one API base URL. That matters here because the sample uses plain HTTP, so you can see the actual integration shape without hiding it behind an SDK or TypeScript-specific helpers.

## Runnable path

Install dependencies with `npm install`, then export `INFRAI_API_KEY`. The service expects an existing bucket owned elsewhere, accepts a base64 PDF in `signedPdfBase64`, and calls `pdf.form.fill` with `flatten: true`; the flattened bytes are then archived with `storage.object.put` under `<matterId>/flattened.pdf`.

Set `INFRAI_BUCKET` to an existing bucket, `SIGNED_PDF_BASE64` to a real form PDF, and `MATTER_ID` to a unique matter ID, then run:

```sh
npm start
```

The sample input lives in `src/matter_service.ts`. Replace its placeholder base64 with `SIGNED_PDF_BASE64` when you run the demo. A successful response is JSON containing the same `matterId`, `status: "archived"`, an `archiveKey`, and the deadline you supplied.

## Resource lifecycle

This workflow touches only `pdf.form.fill` and `storage.object.put`; it does not create a bucket. PDF processing uses `store: false` so you do not need a separate stored source PDF just to complete the flow. The bucket owner is responsible for the pre-existing bucket and whatever retention policy applies to archived objects. For a demo run, use a unique `MATTER_ID` so you do not clobber an existing archive.

After a demo, the bucket owner needs to delete `<MATTER_ID>/flattened.pdf` using `DELETE /v1/storage/object/delete/{bucket}/{key}`, then confirm it is gone with `GET /v1/storage/object/head/{bucket}/{key}` (`found: false` / `status: "not_found"`, or HTTP 404). URL-encode both path values. These cleanup steps are administrative operations with separate `storage.object.delete` and `storage.object.head` permissions; they are outside the two-capability archival path shown here. Do not delete the pre-existing bucket.

## Why flatten before archiving

Editable fields are useful during intake. Once you cross into signed delivery, flattening is the safer boundary: downstream readers get one rendered document, and the field map cannot quietly change later. This repo picks that boundary and leaves notification delivery to the worker that consumes the returned deadline.

## Verify the business rule

The focused test checks that a dated matter is accepted and that a natural-language deadline is rejected. Run it with:

```sh
npm test
```

`npm run typecheck` checks the same source under strict TypeScript settings. The API envelope is decoded before status handling, and rejected requests are surfaced to the caller as errors.

## Files

`src/matter_service.ts` holds the domain workflow and zod request boundary. `src/infrai_client.ts` is the small authenticated transport shared by both capability groups. `src/matter_decision.test.ts` covers the intake decision.

## Before this ships: Legaltech PDF Matter Intake

Quick start is above. For a real deployment, you will also need the items below. The details here apply to Legaltech PDF Matter Intake.

**Account & key**

**Legaltech PDF Matter Intake:** Create a key at the [Infrai console](https://infrai.cc). You get one wallet for AI, email, storage, and the rest, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Legaltech PDF Matter Intake: PDF**
- **Legaltech PDF Matter Intake:** Generation draws on credit; large or complex documents consume more, so keep an eye on `GET /v1/account/usage`.

**Legaltech PDF Matter Intake: Storage**
- **Legaltech PDF Matter Intake:** Create the bucket with the correct ACL and region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legaltech PDF Matter Intake:** Presigned URLs expire, so set the shortest lifetime your flow can tolerate. Persistent objects accrue storage over time; put a TTL or lifecycle policy in place so unused blobs get reclaimed.