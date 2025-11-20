# Digital Credentials Button

A web component that asks your backend for a Digital Credentials API request, calls `navigator.credentials.get`, and posts the returned credential back for verification.

## Package usage

```bash
npm install @waltid/digital-credentials
```

```html
<script type="module">
  import '@waltid/digital-credentials';
</script>

<digital-credentials-button
  config-endpoint="/api/dc/config"
  label="Request credentials"
></digital-credentials-button>
```

Events:

- `credential-request-started`
- `credential-received` (`detail: { credential, backendResponse }`)
- `credential-error` (`detail: { stage, error }`)

Attributes / properties:

- `config-endpoint` (required) — backend endpoint for both the config fetch and credential post
- `label` (optional) — button text (default: `Request credentials`)
- `method` (optional) — HTTP verb used when posting the credential (default: `POST`)

## Repository layout

- `packages/digital-credentials` — the web component source, build config, and types
- `packages/dc-mock-utils` — shared `installMocks()` helper and Vite dev-server plugin
- `fixtures/` — shared JSON files for the mock flows
- `apps/web-demo` — frameworkless demo that mirrors the original sample
- `apps/react-demo` — React demo using the custom element in JSX
- `apps/vue-demo` — Vue demo using the custom element in templates

## Local development

```bash
npm install

# Build the web component
npm run build

# Build demos
npm run build --workspace apps/web-demo
npm run build --workspace apps/react-demo
npm run build --workspace apps/vue-demo

# Run a demo (pick one)
npm run dev:web
npm run dev:react
npm run dev:vue
```

Each dev server exposes `GET/POST /api/dc/config` using the shared fixtures so the button works immediately.

## Mocking

All demos call `installMocks()` from `@waltid/dc-mock-utils/install-mocks`, which:

- stubs `navigator.credentials.get` with `fixtures/unsigned-mdl-response.json`
- mocks `GET /api/dc/config` with `fixtures/unsigned-mdl-request.json`
- echoes credential submissions with `fixtures/credentials-response.json`

Toggle the mock via `?dc-mock=1` / `?dc-mock=0` or the UI toggle (persisted to `localStorage: dc-mock-enabled`).

## App logic

1.) The DC API Request (Credential query) should be loaded when hitting the button from the config endpoint by passing a configurationId: "GET /api/dc/config/${configurationId}" e.g.: "GET /api/dc/config/unsigned-mdl-request". And the response is logged. This should be done when mock mode is enabled or not. If mock mode is enabled then file unsigned-mdl-response.json is returned. If mock mode is enabled, then the reald backend at POST https://verifier2.portal.test.waltid.cloud/verification-session/create is called, and the sessionId e.g. "sessionId": "e102ecf7-0ecc-4085-85a7-6690ef1cfb1f" stored in the middleware in memory. Afterwards, another backend endpoint is called at: POST https://verifier2.portal.test.waltid.cloud/verification-session/<sessionId>/request using the sessionId from before. The result is the response from the middleware, the DC API Request, that is then sent to the DC API in the next step

2.) This request is then sent to the DC API, but only if mock mode is disabled. 

3.) In case of success or failure the response from the DC API should be logged. When mock mode is enabled, the response unsigned-mdl-response.json should be logged.

4.) In case of success, as well as when mock mode is enabled, the response is sent to the backend at POST /api/dc/response. This endpoint is currently missing. So please add this one. This is the place where the backend validates the credential. When mock mode is disabled, the application should call the real backend at https://verifier2.portal.test.waltid.cloud/verification-session/<sessionId>/response and return the value to the client, where it is logged. When mock mode is enabled, then the credentials-response.json is returnend.


# This is how the log should look when mock mode is enabled:
[started] credential-request-started

Digital Credentials API request:
{
  "digital": {
    "requests": [
      {
        "protocol": "openid4vp-v1-unsigned",
        "data": {
          "client_metadata": {
            "vp_formats_supported": {
              "mso_mdoc": {
                "deviceauth_alg_values": [
                  -7
                ],
                "issuerauth_alg_values": [
                  -7
                ]
              }
            }
          },
          "dcql_query": {
            "credentials": [
              {
                "claims": [
                  {
                    "path": [
                      "org.iso.18013.5.1",
                      "family_name"
                    ]
                  },
                  {
                    "path": [
                      "org.iso.18013.5.1",
                      "given_name"
                    ]
                  },
                  {
                    "path": [
                      "org.iso.18013.5.1",
                      "age_over_21"
                    ]
                  }
                ],
                "format": "mso_mdoc",
                "id": "cred1",
                "meta": {
                  "doctype_value": "org.iso.18013.5.1.mDL"
                }
              }
            ]
          },
          "nonce": "PAj3sp38_A1APTo-j-A9U4eCnon6pfApO27kZ69mwUM",
          "response_mode": "dc_api",
          "response_type": "vp_token"
        }
      }
    ]
  }
}

Digital Credentials API response:
{
    "protocol": "openid4vp-v1-unsigned",
    "data": {
        "vp_token": {
            "cred1": [
                "o2d2ZXJzaW9uYzEuMGlkb2N1bWVudHOBo2dkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGxpc3N1ZXJTaWduZWSiam5hbWVTcGFjZXOhcW9yZy5pc28uMTgwMTMuNS4xg9gYWFSkaGRpZ2VzdElEAGZyYW5kb21QEloNL96oPMkJmnXv9ESbW3FlbGVtZW50SWRlbnRpZmllcmtmYW1pbHlfbmFtZWxlbGVtZW50VmFsdWVlU21pdGjYGFhRpGhkaWdlc3RJRAFmcmFuZG9tUKQwy6zsJN0wZkMPQxjbyWJxZWxlbWVudElkZW50aWZpZXJqZ2l2ZW5fbmFtZWxlbGVtZW50VmFsdWVjSm9u2BhYT6RoZGlnZXN0SUQCZnJhbmRvbVBfiTVUPq1IQvzu0cugg7b9cWVsZW1lbnRJZGVudGlmaWVya2FnZV9vdmVyXzIxbGVsZW1lbnRWYWx1ZfVqaXNzdWVyQXV0aIRDoQEmoRghWQLEMIICwDCCAmegAwIBAgIUHn8bMq1PNO_ksMwHt7DjM6cLGE0wCgYIKoZIzj0EAwIweTELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAcMDU1vdW50YWluIFZpZXcxHDAaBgNVBAoME0RpZ2l0YWwgQ3JlZGVudGlhbHMxHzAdBgNVBAMMFmRpZ2l0YWxjcmVkZW50aWFscy5kZXYwHhcNMjUwMjE5MjMzMDE4WhcNMjYwMjE5MjMzMDE4WjB5MQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNTW91bnRhaW4gVmlldzEcMBoGA1UECgwTRGlnaXRhbCBDcmVkZW50aWFsczEfMB0GA1UEAwwWZGlnaXRhbGNyZWRlbnRpYWxzLmRldjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABOt5Nivi1_OXw1AEfYPh42Is41VrNg9qaMdYuw3cavhsCa-aXV0NmTl2EsNaJ5GWmMoAD8ikwAFszYhIeNgF42mjgcwwgckwHwYDVR0jBBgwFoAUok_0idl8Ruhuo4bZR0jOzL7cz_UwHQYDVR0OBBYEFN_-aloS6cBixLyYpyXS2XD3emAoMDQGA1UdHwQtMCswKaAnoCWGI2h0dHBzOi8vZGlnaXRhbC1jcmVkZW50aWFscy5kZXYvY3JsMCoGA1UdEgQjMCGGH2h0dHBzOi8vZGlnaXRhbC1jcmVkZW50aWFscy5kZXYwDgYDVR0PAQH_BAQDAgeAMBUGA1UdJQEB_wQLMAkGByiBjF0FAQIwCgYIKoZIzj0EAwIDRwAwRAIgYcXL9XzB43vy4LEz2h8gMQRdcJtaIRQOemgwm8sHQucCIHCvouHEm_unjBXMCeUZ7QR_ympjGyHITw25_B9H9QsCWQOk2BhZA5-mZ3ZlcnNpb25jMS4wb2RpZ2VzdEFsZ29yaXRobWdTSEEtMjU2Z2RvY1R5cGV1b3JnLmlzby4xODAxMy41LjEubURMbHZhbHVlRGlnZXN0c6Fxb3JnLmlzby4xODAxMy41LjGxAFggng2tWJR7fp49froXSRnsklR_sI-cX_vtNAgkCpdH7KcBWCC0FPEWRP0z6_Rt-ttqzJN5g6hoLJ3nrVljFBcO7RybfwJYIO6B7hZWOTAt0Kz_o7zCJclTcb6SJr_404PWx8RAzjN_A1ggeLRVnN98xkCw3ysIv4PDTCAhZkTqgDSVi-jkN9poMYUEWCDowY3mzymtYR69jFIoHo-NrNdCCxD9k9OogqIHrU3m0QVYILN8AZMmJ9Qq9bwUbsVAQVUP-QtoPmlYdIBTmXJNbr1oBlggzqXSfF8t4hF5hU5wGmxZa0he4VTpAQOCeUTNKP5rA5wHWCATqvZD_qvPdBVcFyUxmIRAK3CgDFrAdzfLMkkRyIIDzAhYIKzeNnZGdWcMC2mXpck7pWMHiVOMDGqSA5M_1lfqO7-wCVggVOyCZq3s73xJMoLhL4b1zoa_hV_twW4xUtyyoWm98nMKWCAzTGC3kG1f25U5RLQUOPNZ1fslnEvfMeLrRXgj19yFxgtYII0QK_PhhkC_VYFaCysXkdtwBGJb6Z3I8fFufwgIGo2NDFggQHxV4YQJLdbpxcfZiPIuocbCZDozc1f0fe9m4-lwVnENWCCY0f4Pabks2V2efyNUpA-Bc0qSG88o0gYgg6mZ-d48ww5YIHDHCfY18n5O6_740xNe_5HMn7D0jHFFymsk5FCNRSQ2D1gg4Qu7JMWCmI1bO1L8kN59jpJyZ9QXNgsG2p679UzAomAQWCAbGPycoabYvTGW6hX0onS3jiCLdi874pBb-hzB1STJ4W1kZXZpY2VLZXlJbmZvoWlkZXZpY2VLZXmkAQIgASFYIEgd6IsLll1JJy7WL7pRu_fcGKaJ8xCKt6klhXBcQJ9PIlggni7iZtdNwuuORu3f_5AeypnVHIu_U5rm4FtrGy-YyIJsdmFsaWRpdHlJbmZvo2ZzaWduZWTAeBsyMDI1LTA5LTI5VDAwOjE5OjUzLjYwODQ3M1ppdmFsaWRGcm9twHgbMjAyNS0wOS0yOVQwMDoxOTo1My42MDg0OTFaanZhbGlkVW50aWzAeBsyMDM1LTA5LTE3VDAwOjE5OjUzLjYwODQ5MlpYQCm_oEaEsbGd7vTDkT1DyLfJ8AYw4AVYYH5mvypCWe09qV2-iLNWF_Q5QMUwOotaJrblStdSZQK-HQydqYXumaxsZGV2aWNlU2lnbmVkompuYW1lU3BhY2Vz2BhBoGpkZXZpY2VBdXRooW9kZXZpY2VTaWduYXR1cmWEQ6EBJqD2WEBQfsWbCKjp9wVT4SBGuH77By4f7EAfZSq2RUpqHykWy44Sngq4xSQh5tDEWHvsXUydxXqFXn3PU5qvDKMY1PoWZnN0YXR1cwA"
            ]
        }
    }
}

Credential Verification response:

{
    "credentials": [
        {
            "docType": "org.iso.18013.5.1.mDL",
            "issuerInfo": {
                "commonName": "walt.id"
            },
            "validityInfo": {
                "signed": "2023-05-02T04:00:00.000Z",
                "validFrom": "2023-05-02T04:00:00.000Z",
                "validUntil": "2029-09-01T23:33:20.000Z"
            },
            "claims": {
                "given_name": {
                    "value": "Max"
                },
                "family_name": {
                    "value": "Power"
                }
            },
            "verificationResult": {
                "verified": true
            }
        }
    ]
}


{
    "message": "Failed to create verification session (400): {\"exception\":true,\"id\":\"BadRequestException\",\"status\":\"Bad Request\",\"code\":\"400\",\"message\":\"Failed to convert request body to class id.walt.openid4vp.verifier.VerificationSessionCreator$VerificationSessionSetup\",\"cause1_exception\":\"JsonConvertException\",\"cause1_message\":\"Illegal input: Encountered an unknown key 'parsed' at offset 2 at path: $\\nUse 'ignoreUnknownKeys = true' in 'Json {}' builder or '@JsonIgnoreUnknownKeys' annotation to ignore unknown keys.\\nJSON input: {\\\"parsed\\\":{\\\"dcql_query\\\":{\\\"creden.....\",\"cause2_exception\":\"JsonDecodingException\",\"cause2_message\":\"Encountered an unknown key 'parsed' at offset 2 at path: $\\nUse 'ignoreUnknownKeys = true' in 'Json {}' builder or '@JsonIgnoreUnknownKeys' annotation to ignore unknown keys.\\nJSON input: {\\\"parsed\\\":{\\\"dcql_query\\\":{\\\"creden.....\"}"
}