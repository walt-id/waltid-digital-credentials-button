# Web Demo

Vite demo for `<digital-credentials-button>` backed by the in-repo demo backend (`@waltid/dc-backend-demo`). It fetches a Digital Credentials API request, calls `navigator.credentials.get`, and sends the response for verification.

## Local development
- From repo root: `npm install`
- Build shared packages once: `npm run build`
- Run the demo: `npm run dev --workspace apps/web-demo` (defaults to port 5173)

## Docker
- Build: `docker build -t waltid/digital-credentials -f apps/web-demo/Dockerfile .`
- Run: `docker run --rm -p 8080:80 waltid/digital-credentials`
- Optional: `VERIFIER_BASE=https://verifier.example.com` to point the demo backend at a different verifier.

docker build -t waltid/digital-credentials -f apps/web-demo/Dockerfile .

The demo supports two retrieval protocols:
- OpenID4VP (dc_api): `/api/dc/request` + `/api/dc/response`
- ISO 18013-7 Annex C (org.iso.mdoc): `/api/dc/annex-c/request` + `/api/dc/annex-c/response` (backed by verifier `/verification-session/*` with `flow_type: "dc_api-annex-c"`)

Use a browser with Digital Credentials API support.

Let's implement a simple test-application for testing the DC API:

1.) Initate a new webapp at apps/dc-api-test
2.) Read open api docs here https://verifier2.portal.test.waltid.cloud/api.json
3.) Create a dropdown, which list's all examples from Swagger Endpoint https://verifier2.portal.test.waltid.cloud/ verification-session/create that contain the string "dc_api" in the title
4.) Create an input filed that always shown the first selected example, which will be refreshed when selecting another one. It should also be possible to edit the payload.
5.) There should be another button called "Call DC API", which calls https://verifier2.portal.test.waltid.cloud/ verification-session/create and stores the returned sessionID in the browsers session, then calls https://verifier2.portal.test.waltid.cloud/verification-session/<sessionID>/request with the sessionID from before, takes the result and calls the DC API of the browswer (navigator... , same as in the other demos)
5.) The response is sent to https://verifier2.portal.test.waltid.cloud/verification-session/<sessionID>/response
6.) The result is logged
7.) The application should poll https://verifier2.portal.test.waltid.cloud/verification-session/<sessionID>/info with a 10 sec intervall and, once the result is available, the result is logged and the execution is complete.

Generally, all request-response objects should be logged to the browser console.



https://verifier2.portal.test.waltid.cloud/swagger/index.html





{
  "id": "2e7a4ca4-a39e-4056-b4ca-023e4622c978",
  "setup": {
    "flow_type": "dc_api-annex-c",
    "docType": "org.iso.18013.5.1.mDL",
    "requestedElements": {
      "org.iso.18013.5.1": [
        "family_name",
        "given_name",
        "age_over_21"
      ]
    },
    "policies": {
      "vc_policies": [
        {
          "policy": "signature",
          "id": "signature"
        }
      ]
    },
    "origin": "http://localhost:5173",
    "core_flow": {
      "dcql_query": {
        "credentials": [
          {
            "id": "annex_c",
            "format": "mso_mdoc",
            "multiple": false,
            "meta": {
              "doctype_value": "org.iso.18013.5.1.mDL",
              "format": "mso_mdoc"
            },
            "require_cryptographic_holder_binding": true,
            "claims": [
              {
                "path": [
                  "org.iso.18013.5.1",
                  "age_over_21"
                ]
              },
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
              }
            ]
          }
        ]
      },
      "signed_request": false,
      "encrypted_response": false,
      "policies": {
        "vc_policies": [
          {
            "policy": "signature",
            "id": "signature"
          }
        ]
      }
    }
  },
  "data": {
    "protocol": "org-iso-mdoc",
    "data": {
      "deviceRequest": "omd2ZXJzaW9uYzEuMGtkb2NSZXF1ZXN0c4GhbGl0ZW1zUmVxdWVzdNgYWGSiZ2RvY1R5cGV1b3JnLmlzby4xODAxMy41LjEubURMam5hbWVTcGFjZXOhcW9yZy5pc28uMTgwMTMuNS4xo2tmYW1pbHlfbmFtZfRqZ2l2ZW5fbmFtZfRrYWdlX292ZXJfMjH0",
      "encryptionInfo": "gmVkY2FwaaJlbm9uY2VYJDIyYzM5N2RlLTMxOGQtNGRlYi05ODllLTk1ZmM5MmI2NzkxMnJyZWNpcGllbnRQdWJsaWNLZXmkAQIgASFYIE41Vzd64i_hmldM69mhScccGflR26YMa4Gmucrqf9poIlggfYHxugJeg5riQdiicRi02Ckaw6KS-G8mJGPmixLATb0"
    }
  },
  "creationDate": "2026-02-16T16:33:04.378876097Z",
  "expirationDate": "2026-02-16T16:38:04.378876097Z",
  "retentionDate": "2036-02-16T16:33:04.378876097Z",
  "status": "SUCCESSFUL",
  "attempted": true,
  "reattemptable": true,
  "authorizationRequest": {
    "response_mode": "dc_api.jwt",
    "nonce": "22c397de-318d-4deb-989e-95fc92b67912",
    "dcql_query": {
      "credentials": [
        {
          "id": "annex_c",
          "format": "mso_mdoc",
          "multiple": false,
          "meta": {
            "doctype_value": "org.iso.18013.5.1.mDL",
            "format": "mso_mdoc"
          },
          "require_cryptographic_holder_binding": true,
          "claims": [
            {
              "path": [
                "org.iso.18013.5.1",
                "age_over_21"
              ]
            },
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
            }
          ]
        }
      ]
    },
    "client_metadata": {
      "jwks": {
        "keys": [
          {
            "kty": "EC",
            "crv": "P-256",
            "kid": "NphR9UOu06UjccgQZFyRhJuKP-bdsEjJROXui8zyZE8",
            "x": "TjVXN3riL-GaV0zr2aFJxxwZ-VHbpgxrgaa5yup_2mg",
            "y": "fYHxugJeg5riQdiicRi02Ckaw6KS-G8mJGPmixLATb0",
            "alg": "ECDH-ES",
            "use": "enc"
          }
        ]
      },
      "vp_formats_supported": {
        "mso_mdoc": {}
      },
      "encrypted_response_enc_values_supported": [
        "A128GCM"
      ]
    },
    "expected_origins": [
      "http://localhost:5173"
    ]
  },
  "authorizationRequestUrl": "http://localhost:5173?response_mode=dc_api.jwt&nonce=22c397de-318d-4deb-989e-95fc92b67912&dcql_query=%7B%22credentials%22%3A%5B%7B%22id%22%3A%22annex_c%22%2C%22format%22%3A%22mso_mdoc%22%2C%22meta%22%3A%7B%22doctype_value%22%3A%22org.iso.18013.5.1.mDL%22%7D%2C%22claims%22%3A%5B%7B%22path%22%3A%5B%22org.iso.18013.5.1%22%2C%22age_over_21%22%5D%7D%2C%7B%22path%22%3A%5B%22org.iso.18013.5.1%22%2C%22family_name%22%5D%7D%2C%7B%22path%22%3A%5B%22org.iso.18013.5.1%22%2C%22given_name%22%5D%7D%5D%7D%5D%7D&client_metadata=%7B%22jwks%22%3A%7B%22keys%22%3A%5B%7B%22kty%22%3A%22EC%22%2C%22crv%22%3A%22P-256%22%2C%22kid%22%3A%22NphR9UOu06UjccgQZFyRhJuKP-bdsEjJROXui8zyZE8%22%2C%22x%22%3A%22TjVXN3riL-GaV0zr2aFJxxwZ-VHbpgxrgaa5yup_2mg%22%2C%22y%22%3A%22fYHxugJeg5riQdiicRi02Ckaw6KS-G8mJGPmixLATb0%22%2C%22alg%22%3A%22ECDH-ES%22%2C%22use%22%3A%22enc%22%7D%5D%7D%2C%22vp_formats_supported%22%3A%7B%22mso_mdoc%22%3A%7B%7D%7D%2C%22encrypted_response_enc_values_supported%22%3A%5B%22A128GCM%22%5D%7D&expected_origins=%5B%22http%3A%2F%2Flocalhost%3A5173%22%5D",
  "ephemeralDecryptionKey": {
    "type": "jwk",
    "jwk": {
      "kty": "EC",
      "d": "pcrRnVzY-11EZTDCS3m9McA32EcbIAlD5c_JK0TYK0E",
      "crv": "P-256",
      "kid": "NphR9UOu06UjccgQZFyRhJuKP-bdsEjJROXui8zyZE8",
      "x": "TjVXN3riL-GaV0zr2aFJxxwZ-VHbpgxrgaa5yup_2mg",
      "y": "fYHxugJeg5riQdiicRi02Ckaw6KS-G8mJGPmixLATb0"
    }
  },
  "jwkThumbprint": "NphR9UOu06UjccgQZFyRhJuKP-bdsEjJROXui8zyZE8",
  "requestMode": "REQUEST_URI",
  "policies": {
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/sd_hash-check"
      ],
      "mso_mdoc": [
        "mso_mdoc/device-auth",
        "mso_mdoc/device_key_auth",
        "mso_mdoc/issuer_auth",
        "mso_mdoc/issuer_signed_integrity",
        "mso_mdoc/mso"
      ]
    },
    "vc_policies": [
      {
        "policy": "signature",
        "id": "signature"
      }
    ]
  },
  "policy_results": {
    "vp_policies": {
      "annex_c": {
        "mso_mdoc/device-auth": {
          "policy_executed": {
            "policy": "mso_mdoc/device-auth",
            "id": "mso_mdoc/device-auth",
            "description": "Verify device authentication"
          },
          "success": true,
          "results": {
            "device_public_jwk": {
              "kty": "EC",
              "crv": "P-256",
              "x": "c0l9FdSd1T7xSkjTuILTvcerLberaRsQyXoQVOv_s_w",
              "y": "dQNx4UOo1EpFluh12vVGVCxuykY6IXRiA4ltdt6HHEs"
            },
            "device_auth_bytes_hex": "d818585c847444657669636541757468656e7469636174696f6e83f6f682656463617069582032a38b29cebb72d0ebefb651454cfe238d30530bda817bc5f28b5df48503610e756f72672e69736f2e31383031332e352e312e6d444cd81841a0"
          },
          "errors": [],
          "execution_time": "PT0.092170132S"
        },
        "mso_mdoc/device_key_auth": {
          "policy_executed": {
            "policy": "mso_mdoc/device_key_auth",
            "id": "mso_mdoc/device_key_auth",
            "description": "Verify holder-verified data"
          },
          "success": true,
          "results": {
            "empty_device_signed_namespaces": true
          },
          "errors": [],
          "execution_time": "PT0.000134205S"
        },
        "mso_mdoc/issuer_auth": {
          "policy_executed": {
            "policy": "mso_mdoc/issuer_auth",
            "id": "mso_mdoc/issuer_auth",
            "description": "Verify issuer authentication"
          },
          "success": true,
          "results": {
            "certificate_chain": [
              "308201f030820195a003020102021002f8aaa84f589a32262fdd590e21eb75300a06082a8648ce3d04030230183116301406035504030c0d546573742049414341204b6579301e170d3235313132353039303332315a170d3236313132353039303332315a30163114301206035504030c0b54657374204453204b65793059301306072a8648ce3d020106082a8648ce3d0301070342000471d28c8fcec5761520d08d5df866bb77aa95b7cd5232974cd5909ab6a1654d525efcdba88cd2fc37e8261a137e9eb8c780c96cc666e7bae260cf1bd60d5ae617a381c23081bf301f0603551d2304183016801431b26f8318023f443e691ec057653944ebbbb43c300e0603551d0f0101ff04040302078030150603551d250101ff040b3009060728818c5d05010230250603551d12041e301c861a68747470733a2f2f6973737565722e6578616d706c652e636f6d302f0603551d1f042830263024a022a020861e68747470733a2f2f6973737565722e6578616d706c652e636f6d2f63726c301d0603551d0e04160414f2c43e0a0d74fa48ccf0065b44f73ba032cbc84a300a06082a8648ce3d04030203490030460221008adb4d83c9e701fc2fe9bb15a2c730e2d160c2039ca553ed081b4a4df2c42af40221008753f6a6ccb9d1694e99503928adb5e8bf805b5c1be41928ed0be9f5c45c8a07"
            ],
            "signer_pem": "-----BEGIN CERTIFICATE-----\nMIIB8DCCAZWgAwIBAgIQAviqqE9YmjImL91ZDiHrdTAKBggqhkjOPQQDAjAYMRYw\r\nFAYDVQQDDA1UZXN0IElBQ0EgS2V5MB4XDTI1MTEyNTA5MDMyMVoXDTI2MTEyNTA5\r\nMDMyMVowFjEUMBIGA1UEAwwLVGVzdCBEUyBLZXkwWTATBgcqhkjOPQIBBggqhkjO\r\nPQMBBwNCAARx0oyPzsV2FSDQjV34Zrt3qpW3zVIyl0zVkJq2oWVNUl7826iM0vw3\r\n6CYaE36euMeAyWzGZue64mDPG9YNWuYXo4HCMIG/MB8GA1UdIwQYMBaAFDGyb4MY\r\nAj9EPmkewFdlOUTru7Q8MA4GA1UdDwEB/wQEAwIHgDAVBgNVHSUBAf8ECzAJBgco\r\ngYxdBQECMCUGA1UdEgQeMByGGmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tMC8G\r\nA1UdHwQoMCYwJKAioCCGHmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tL2NybDAd\r\nBgNVHQ4EFgQU8sQ+Cg10+kjM8AZbRPc7oDLLyEowCgYIKoZIzj0EAwIDSQAwRgIh\r\nAIrbTYPJ5wH8L+m7FaLHMOLRYMIDnKVT7QgbSk3yxCr0AiEAh1P2psy50WlOmVA5\r\nKK216L+AW1wb5Bko7Qvp9cRcigc=\n-----END CERTIFICATE-----",
            "signer_jwk": {
              "kty": "EC",
              "crv": "P-256",
              "x": "cdKMj87FdhUg0I1d-Ga7d6qVt81SMpdM1ZCatqFlTVI",
              "y": "XvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hc"
            }
          },
          "errors": [],
          "execution_time": "PT0.042548931S"
        },
        "mso_mdoc/issuer_signed_integrity": {
          "policy_executed": {
            "policy": "mso_mdoc/issuer_signed_integrity",
            "id": "mso_mdoc/issuer_signed_integrity",
            "description": "Verify issuer-verified data integrity"
          },
          "success": true,
          "results": {
            "namespace": {
              "org.iso.18013.5.1": [
                {
                  "id": "family_name",
                  "digest_id": 13,
                  "value": "Mustermann",
                  "value_type": "String",
                  "random_hex": "70791d201197b016393f7f9f07f5ee40",
                  "serialized_hex": "a46864696765737449440d6672616e646f6d5070791d201197b016393f7f9f07f5ee4071656c656d656e744964656e7469666965726b66616d696c795f6e616d656c656c656d656e7456616c75656a4d75737465726d616e6e"
                },
                {
                  "id": "given_name",
                  "digest_id": 33,
                  "value": "Erika",
                  "value_type": "String",
                  "random_hex": "e92195220444a93d3e0ccb5070d88b94",
                  "serialized_hex": "a468646967657374494418216672616e646f6d50e92195220444a93d3e0ccb5070d88b9471656c656d656e744964656e7469666965726a676976656e5f6e616d656c656c656d656e7456616c7565654572696b61"
                },
                {
                  "id": "age_over_21",
                  "digest_id": 4,
                  "value": true,
                  "value_type": "Boolean",
                  "random_hex": "d31105c73f12e831fbbf359a2e37defd",
                  "serialized_hex": "a4686469676573744944046672616e646f6d50d31105c73f12e831fbbf359a2e37defd71656c656d656e744964656e7469666965726b6167655f6f7665725f32316c656c656d656e7456616c7565f5"
                }
              ]
            },
            "matching_digest": {
              "org.iso.18013.5.1": [
                "family_name",
                "given_name",
                "age_over_21"
              ]
            }
          },
          "errors": [],
          "execution_time": "PT0.010336596S"
        },
        "mso_mdoc/mso": {
          "policy_executed": {
            "policy": "mso_mdoc/mso",
            "id": "mso_mdoc/mso",
            "description": "Verify MSO"
          },
          "success": true,
          "results": {
            "signed": "2025-11-25T09:03:21Z",
            "valid_from": "2026-11-25T09:03:21Z"
          },
          "errors": [],
          "execution_time": "PT0.000131805S"
        }
      }
    },
    "vc_policies": [
      {
        "policy": {
          "policy": "signature",
          "id": "signature"
        },
        "success": true,
        "result": {
          "verification_result": true,
          "signed_credential": "o2d2ZXJzaW9uYzEuMGlkb2N1bWVudHOBo2dkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGxpc3N1ZXJTaWduZWSiam5hbWVTcGFjZXOhcW9yZy5pc28uMTgwMTMuNS4xg9gYWFmkaGRpZ2VzdElEDWZyYW5kb21QcHkdIBGXsBY5P3-fB_XuQHFlbGVtZW50SWRlbnRpZmllcmtmYW1pbHlfbmFtZWxlbGVtZW50VmFsdWVqTXVzdGVybWFubtgYWFSkaGRpZ2VzdElEGCFmcmFuZG9tUOkhlSIERKk9PgzLUHDYi5RxZWxlbWVudElkZW50aWZpZXJqZ2l2ZW5fbmFtZWxlbGVtZW50VmFsdWVlRXJpa2HYGFhPpGhkaWdlc3RJRARmcmFuZG9tUNMRBcc_Eugx-781mi433v1xZWxlbWVudElkZW50aWZpZXJrYWdlX292ZXJfMjFsZWxlbWVudFZhbHVl9Wppc3N1ZXJBdXRohEOhASahGCFZAfQwggHwMIIBlaADAgECAhAC-KqoT1iaMiYv3VkOIet1MAoGCCqGSM49BAMCMBgxFjAUBgNVBAMMDVRlc3QgSUFDQSBLZXkwHhcNMjUxMTI1MDkwMzIxWhcNMjYxMTI1MDkwMzIxWjAWMRQwEgYDVQQDDAtUZXN0IERTIEtleTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHHSjI_OxXYVINCNXfhmu3eqlbfNUjKXTNWQmrahZU1SXvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hejgcIwgb8wHwYDVR0jBBgwFoAUMbJvgxgCP0Q-aR7AV2U5ROu7tDwwDgYDVR0PAQH_BAQDAgeAMBUGA1UdJQEB_wQLMAkGByiBjF0FAQIwJQYDVR0SBB4wHIYaaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20wLwYDVR0fBCgwJjAkoCKgIIYeaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20vY3JsMB0GA1UdDgQWBBTyxD4KDXT6SMzwBltE9zugMsvISjAKBggqhkjOPQQDAgNJADBGAiEAittNg8nnAfwv6bsVoscw4tFgwgOcpVPtCBtKTfLEKvQCIQCHU_amzLnRaU6ZUDkorbXov4BbXBvkGSjtC-n1xFyKB1kIZ9gYWQhipmd2ZXJzaW9uYzEuMG9kaWdlc3RBbGdvcml0aG1nU0hBLTI1Nmdkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGx2YWx1ZURpZ2VzdHOicW9yZy5pc28uMTgwMTMuNS4xuCgNWCAxe1tAq3PxEagr7Iab4jHJUTeccIQgctZ510G5p1Q31xghWCBQj1GqNbTmkY0IIgMHWYaNWPopFjCAbAhmgEaAWlX10BguWCBmo5MEl1tQlS1g3qQWDq6UgtagAqvNMwEhgPVPeucprBgwWCDdkUW0gbEuOzbnfZtqChQdGU3bpNMhleTTqsca9HCV0BgiWCDbhzLZvj_2CvtkdW2R1tWggfBnNZDz8tgTdPBOTrPZMxNYICouFfrgA6pqmGQNeTg9tAWvml4ErUOetJKvaQQo8euPClggzc0SeeRyirrZtE8PnPxLwsItswVTO-X2MVxb82S2TkcYHlggmP-sJbyB5IQo61RGdbJDFrlaSG8wSWykqOvNC7kWDKcYJlggs61JhzH2kmW1P9b93hSESwSb9ydTckhcuIsqRMa_RqgYJFggtIIrUF8_6S4uoGISbwPNM-JnrL5Mq5Gjg5kIkGG8Ae8YJVggaM56o7L3n-ShvGlrumiAaoI94zo-EO9uIw9jBhY2rGMBWCDjrtEFNp3EbuqlUFQVD5MhgAmmC8tc7EuBzny5LOnjkQNYIDqdCZRKRHA_ynbBsEh1UdNTBS501n2FMdXqSRMIu4sIFFggZaKivhhz6IJtKzl_90vTnbU7EDw-DCo2d8UMCY8rj4QYHVggZe-hPAn97VmHRTfja-zPL8yN_tIl_T_vNOwoHPp_eIQAWCCK52ZT1TBl23uD2RGoJoF6iCJdbVxyFniWC4-2dD8LkBgoWCA4PEmAaxXaIJd-hFUvT-AdsYmtU3QuqT_-eoBnueB_XwZYIAv1h8e0Spq70lDhetunoBMyMFIM5TSfk_qGdfBZn_IXGClYIE-JV69EUW-KpEqPnRNaYJAU_dg558ibMVBA77jiFHM3GCBYIAtVXhp58iBpPLLT01MQkMD15khNRfvjLgTABexTE6a1GCpYIJHIB-0WO7bwU3yo_xwbDw_sCbz0waIqOW4Kur8FJhwHC1ggfx_vmZVFe8CUjkJOaazErZSLtyKDwOGNeGCGxCn6O8kXWCBF_mQGAuAlmL2uKIgXWoPaqltbxCfVGSSKEWThPDENShgcWCClyE06BT72WMr32UjgWlKf94pbEOb-yDOm2aOjkAqcXhgyWCDFk3jCntVThpcQ_tF_-KhEPBGlLjQvrCQ5hQuKimQyfQRYIL0MtOh_R1fBOFF7sCZIANqe6Z3X55PnWzEeyCWcdJ1_CVggxpt19mSeWXN_7R8z0ndxGgoRXXJI9wfhmvdRfTMPTn4YGlgg7Mn-pvfHtTSngnyJIGdwhiIJhieBvCER1dtVUdopgnoYMVggh_fOwPxRDer84YFCsPQUTfB22x3AeQ9qzKH6NxUt2oIYK1ggeBVMz0cMIYo-49ZcLnOMUfbPz7a4-qSrjNVjhGM2U58YJ1gge9x6ZIByceFy3KdSulHEH2SHoB3e6TWi5Qd0s70Z8l0OWCC-7vQtq17y4QmbOym6tVD8K9sHgl-Vt-OjTVq1wgRfGxVYIEzO6nS_iqSiVwYgjXy4x9hJVAxhptSIbU-scJf1F-SNGBhYIJC7Ws9czD6TUsKWjpv8MHYle0-1pkfVnTk5gRTlZZXWGBlYIJwU7Q3H0jrd7c96fs9Dq_FghBl_91o8gk0S5zWll-CvDFggPt5RzVWhw3z3hO36maYF8zVSk8QZ6hVZThLMcoXnLAMCWCCSdkkllSfKugieied0v43FqHT5L2ub87gXR53E_grrkhgjWCCHu2lsv2VX13hrwiYgumJ0CqxFxEPKteJcVWY_jIfDyAdYIOdbBrfT2V-Bwzl_k1XUljkLWMqHG3aVq3EF8pWFOujeD1ggUxgPu90U7YVTKo-dgRb0PyETPmYeJzOpyCFdomzp-pJ3b3JnLmlzby4xODAxMy41LjEuYWFtdmGrGCxYIF5PHc8hAulY3pQi4JEEv6I-_DMzslqVj2yGbjB1FkMoGBtYILxo3CyvUV9nIZo6ttyjHomq4goRoGisYTdTe7qmY3ocGB9YINTD6vn8oCVv0nCxwZafdb_a6Yl5z153BGJCjYnyrYxkEFgg0l9KXbZX_0v-lpjbKPqbqCvBbYdSlGGts8exQKOYMbkFWCAKSOLHVH1Lo2VjLeoSoPiJnPfbmXrOd1hPTCQ_7b4AKxgvWCBO-iRhfnp1X8ivD0OBTzYIXFYIoIF7Ia0vqoE1XYH42BJYIGTzfJqZc9fMqZaADOfcnHVBTy2x-5NiFE1eBBRhj4BhEVggd3orojennk39woopFxPiPOu_KSCnDzVgU0gT6sRxcewYLVgg5XZXJVEhvTTVIRhtKTgVxL9UPE9Zb4MiquXFYozS5WwIWCBO9_CC_c__P1ZczlXOqLHIiIsUSzzCOWsXXyTcfiqUdxZYIC68IPFuPbkwCiSfvQpkIt-Ki2mcFH6dCkBTqo9dIX9ebWRldmljZUtleUluZm-haWRldmljZUtleaQBAiABIVggc0l9FdSd1T7xSkjTuILTvcerLberaRsQyXoQVOv_s_wiWCB1A3HhQ6jUSkWW6HXa9UZULG7KRjohdGIDiW123occS2x2YWxpZGl0eUluZm-jZnNpZ25lZMB0MjAyNS0xMS0yNVQwOTowMzoyMVppdmFsaWRGcm9twHQyMDI1LTExLTI1VDA5OjAzOjIxWmp2YWxpZFVudGlswHQyMDI2LTExLTI1VDA5OjAzOjIxWlhAb8emhJa3M6NqFJO6RTSVCDUU7ZVZKYB3QI9VdkRXla740h6MgCACPIJgP-Giwk-WorHjyWLyf-Qp3KvuTW0DQGxkZXZpY2VTaWduZWSiam5hbWVTcGFjZXPYGEGgamRldmljZUF1dGihb2RldmljZVNpZ25hdHVyZYRDoQEmoPZYQGmXitnxaCOnzAaVr1tD3DICIBxfJVjWwhgMKoa0wSb3p2rE4oMntRyy8rHJTUNIs4z3kflnWmgxIurthHCe5UJmc3RhdHVzAA",
          "credential_signature": {
            "type": "signature-cose",
            "signerKey": {
              "type": "jwk",
              "jwk": {
                "kty": "EC",
                "crv": "P-256",
                "x": "cdKMj87FdhUg0I1d-Ga7d6qVt81SMpdM1ZCatqFlTVI",
                "y": "XvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hc"
              }
            },
            "x5cList": [
              "MIIB8DCCAZWgAwIBAgIQAviqqE9YmjImL91ZDiHrdTAKBggqhkjOPQQDAjAYMRYwFAYDVQQDDA1UZXN0IElBQ0EgS2V5MB4XDTI1MTEyNTA5MDMyMVoXDTI2MTEyNTA5MDMyMVowFjEUMBIGA1UEAwwLVGVzdCBEUyBLZXkwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARx0oyPzsV2FSDQjV34Zrt3qpW3zVIyl0zVkJq2oWVNUl7826iM0vw36CYaE36euMeAyWzGZue64mDPG9YNWuYXo4HCMIG/MB8GA1UdIwQYMBaAFDGyb4MYAj9EPmkewFdlOUTru7Q8MA4GA1UdDwEB/wQEAwIHgDAVBgNVHSUBAf8ECzAJBgcogYxdBQECMCUGA1UdEgQeMByGGmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tMC8GA1UdHwQoMCYwJKAioCCGHmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tL2NybDAdBgNVHQ4EFgQU8sQ+Cg10+kjM8AZbRPc7oDLLyEowCgYIKoZIzj0EAwIDSQAwRgIhAIrbTYPJ5wH8L+m7FaLHMOLRYMIDnKVT7QgbSk3yxCr0AiEAh1P2psy50WlOmVA5KK216L+AW1wb5Bko7Qvp9cRcigc="
            ]
          },
          "verified_data": {
            "docType": "org.iso.18013.5.1.mDL",
            "org.iso.18013.5.1": {
              "family_name": "Mustermann",
              "given_name": "Erika",
              "age_over_21": true
            }
          },
          "successful_issuer_public_key": {
            "kty": "EC",
            "crv": "P-256",
            "x": "cdKMj87FdhUg0I1d-Ga7d6qVt81SMpdM1ZCatqFlTVI",
            "y": "XvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hc"
          },
          "successful_issuer_public_key_id": "x6cYFb3RDUBYY4MO5m-FmjpkGFGqVQYGJgw90n1WNDI"
        }
      }
    ],
    "specific_vc_policies": {},
    "overallSuccess": true
  },
  "presentation_validation_results": {
    "annex_c": {
      "mso_mdoc/device-auth": {
        "policy_executed": {
          "policy": "mso_mdoc/device-auth",
          "id": "mso_mdoc/device-auth",
          "description": "Verify device authentication"
        },
        "success": true,
        "results": {
          "device_public_jwk": {
            "kty": "EC",
            "crv": "P-256",
            "x": "c0l9FdSd1T7xSkjTuILTvcerLberaRsQyXoQVOv_s_w",
            "y": "dQNx4UOo1EpFluh12vVGVCxuykY6IXRiA4ltdt6HHEs"
          },
          "device_auth_bytes_hex": "d818585c847444657669636541757468656e7469636174696f6e83f6f682656463617069582032a38b29cebb72d0ebefb651454cfe238d30530bda817bc5f28b5df48503610e756f72672e69736f2e31383031332e352e312e6d444cd81841a0"
        },
        "errors": [],
        "execution_time": "PT0.092170132S"
      },
      "mso_mdoc/device_key_auth": {
        "policy_executed": {
          "policy": "mso_mdoc/device_key_auth",
          "id": "mso_mdoc/device_key_auth",
          "description": "Verify holder-verified data"
        },
        "success": true,
        "results": {
          "empty_device_signed_namespaces": true
        },
        "errors": [],
        "execution_time": "PT0.000134205S"
      },
      "mso_mdoc/issuer_auth": {
        "policy_executed": {
          "policy": "mso_mdoc/issuer_auth",
          "id": "mso_mdoc/issuer_auth",
          "description": "Verify issuer authentication"
        },
        "success": true,
        "results": {
          "certificate_chain": [
            "308201f030820195a003020102021002f8aaa84f589a32262fdd590e21eb75300a06082a8648ce3d04030230183116301406035504030c0d546573742049414341204b6579301e170d3235313132353039303332315a170d3236313132353039303332315a30163114301206035504030c0b54657374204453204b65793059301306072a8648ce3d020106082a8648ce3d0301070342000471d28c8fcec5761520d08d5df866bb77aa95b7cd5232974cd5909ab6a1654d525efcdba88cd2fc37e8261a137e9eb8c780c96cc666e7bae260cf1bd60d5ae617a381c23081bf301f0603551d2304183016801431b26f8318023f443e691ec057653944ebbbb43c300e0603551d0f0101ff04040302078030150603551d250101ff040b3009060728818c5d05010230250603551d12041e301c861a68747470733a2f2f6973737565722e6578616d706c652e636f6d302f0603551d1f042830263024a022a020861e68747470733a2f2f6973737565722e6578616d706c652e636f6d2f63726c301d0603551d0e04160414f2c43e0a0d74fa48ccf0065b44f73ba032cbc84a300a06082a8648ce3d04030203490030460221008adb4d83c9e701fc2fe9bb15a2c730e2d160c2039ca553ed081b4a4df2c42af40221008753f6a6ccb9d1694e99503928adb5e8bf805b5c1be41928ed0be9f5c45c8a07"
          ],
          "signer_pem": "-----BEGIN CERTIFICATE-----\nMIIB8DCCAZWgAwIBAgIQAviqqE9YmjImL91ZDiHrdTAKBggqhkjOPQQDAjAYMRYw\r\nFAYDVQQDDA1UZXN0IElBQ0EgS2V5MB4XDTI1MTEyNTA5MDMyMVoXDTI2MTEyNTA5\r\nMDMyMVowFjEUMBIGA1UEAwwLVGVzdCBEUyBLZXkwWTATBgcqhkjOPQIBBggqhkjO\r\nPQMBBwNCAARx0oyPzsV2FSDQjV34Zrt3qpW3zVIyl0zVkJq2oWVNUl7826iM0vw3\r\n6CYaE36euMeAyWzGZue64mDPG9YNWuYXo4HCMIG/MB8GA1UdIwQYMBaAFDGyb4MY\r\nAj9EPmkewFdlOUTru7Q8MA4GA1UdDwEB/wQEAwIHgDAVBgNVHSUBAf8ECzAJBgco\r\ngYxdBQECMCUGA1UdEgQeMByGGmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tMC8G\r\nA1UdHwQoMCYwJKAioCCGHmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tL2NybDAd\r\nBgNVHQ4EFgQU8sQ+Cg10+kjM8AZbRPc7oDLLyEowCgYIKoZIzj0EAwIDSQAwRgIh\r\nAIrbTYPJ5wH8L+m7FaLHMOLRYMIDnKVT7QgbSk3yxCr0AiEAh1P2psy50WlOmVA5\r\nKK216L+AW1wb5Bko7Qvp9cRcigc=\n-----END CERTIFICATE-----",
          "signer_jwk": {
            "kty": "EC",
            "crv": "P-256",
            "x": "cdKMj87FdhUg0I1d-Ga7d6qVt81SMpdM1ZCatqFlTVI",
            "y": "XvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hc"
          }
        },
        "errors": [],
        "execution_time": "PT0.042548931S"
      },
      "mso_mdoc/issuer_signed_integrity": {
        "policy_executed": {
          "policy": "mso_mdoc/issuer_signed_integrity",
          "id": "mso_mdoc/issuer_signed_integrity",
          "description": "Verify issuer-verified data integrity"
        },
        "success": true,
        "results": {
          "namespace": {
            "org.iso.18013.5.1": [
              {
                "id": "family_name",
                "digest_id": 13,
                "value": "Mustermann",
                "value_type": "String",
                "random_hex": "70791d201197b016393f7f9f07f5ee40",
                "serialized_hex": "a46864696765737449440d6672616e646f6d5070791d201197b016393f7f9f07f5ee4071656c656d656e744964656e7469666965726b66616d696c795f6e616d656c656c656d656e7456616c75656a4d75737465726d616e6e"
              },
              {
                "id": "given_name",
                "digest_id": 33,
                "value": "Erika",
                "value_type": "String",
                "random_hex": "e92195220444a93d3e0ccb5070d88b94",
                "serialized_hex": "a468646967657374494418216672616e646f6d50e92195220444a93d3e0ccb5070d88b9471656c656d656e744964656e7469666965726a676976656e5f6e616d656c656c656d656e7456616c7565654572696b61"
              },
              {
                "id": "age_over_21",
                "digest_id": 4,
                "value": true,
                "value_type": "Boolean",
                "random_hex": "d31105c73f12e831fbbf359a2e37defd",
                "serialized_hex": "a4686469676573744944046672616e646f6d50d31105c73f12e831fbbf359a2e37defd71656c656d656e744964656e7469666965726b6167655f6f7665725f32316c656c656d656e7456616c7565f5"
              }
            ]
          },
          "matching_digest": {
            "org.iso.18013.5.1": [
              "family_name",
              "given_name",
              "age_over_21"
            ]
          }
        },
        "errors": [],
        "execution_time": "PT0.010336596S"
      },
      "mso_mdoc/mso": {
        "policy_executed": {
          "policy": "mso_mdoc/mso",
          "id": "mso_mdoc/mso",
          "description": "Verify MSO"
        },
        "success": true,
        "results": {
          "signed": "2025-11-25T09:03:21Z",
          "valid_from": "2026-11-25T09:03:21Z"
        },
        "errors": [],
        "execution_time": "PT0.000131805S"
      }
    }
  },
  "presentedRawData": {
    "vpToken": {
      "annex_c": [
        "o2d2ZXJzaW9uYzEuMGlkb2N1bWVudHOBo2dkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGxpc3N1ZXJTaWduZWSiam5hbWVTcGFjZXOhcW9yZy5pc28uMTgwMTMuNS4xg9gYWFmkaGRpZ2VzdElEDWZyYW5kb21QcHkdIBGXsBY5P3-fB_XuQHFlbGVtZW50SWRlbnRpZmllcmtmYW1pbHlfbmFtZWxlbGVtZW50VmFsdWVqTXVzdGVybWFubtgYWFSkaGRpZ2VzdElEGCFmcmFuZG9tUOkhlSIERKk9PgzLUHDYi5RxZWxlbWVudElkZW50aWZpZXJqZ2l2ZW5fbmFtZWxlbGVtZW50VmFsdWVlRXJpa2HYGFhPpGhkaWdlc3RJRARmcmFuZG9tUNMRBcc_Eugx-781mi433v1xZWxlbWVudElkZW50aWZpZXJrYWdlX292ZXJfMjFsZWxlbWVudFZhbHVl9Wppc3N1ZXJBdXRohEOhASahGCFZAfQwggHwMIIBlaADAgECAhAC-KqoT1iaMiYv3VkOIet1MAoGCCqGSM49BAMCMBgxFjAUBgNVBAMMDVRlc3QgSUFDQSBLZXkwHhcNMjUxMTI1MDkwMzIxWhcNMjYxMTI1MDkwMzIxWjAWMRQwEgYDVQQDDAtUZXN0IERTIEtleTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHHSjI_OxXYVINCNXfhmu3eqlbfNUjKXTNWQmrahZU1SXvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hejgcIwgb8wHwYDVR0jBBgwFoAUMbJvgxgCP0Q-aR7AV2U5ROu7tDwwDgYDVR0PAQH_BAQDAgeAMBUGA1UdJQEB_wQLMAkGByiBjF0FAQIwJQYDVR0SBB4wHIYaaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20wLwYDVR0fBCgwJjAkoCKgIIYeaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20vY3JsMB0GA1UdDgQWBBTyxD4KDXT6SMzwBltE9zugMsvISjAKBggqhkjOPQQDAgNJADBGAiEAittNg8nnAfwv6bsVoscw4tFgwgOcpVPtCBtKTfLEKvQCIQCHU_amzLnRaU6ZUDkorbXov4BbXBvkGSjtC-n1xFyKB1kIZ9gYWQhipmd2ZXJzaW9uYzEuMG9kaWdlc3RBbGdvcml0aG1nU0hBLTI1Nmdkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGx2YWx1ZURpZ2VzdHOicW9yZy5pc28uMTgwMTMuNS4xuCgNWCAxe1tAq3PxEagr7Iab4jHJUTeccIQgctZ510G5p1Q31xghWCBQj1GqNbTmkY0IIgMHWYaNWPopFjCAbAhmgEaAWlX10BguWCBmo5MEl1tQlS1g3qQWDq6UgtagAqvNMwEhgPVPeucprBgwWCDdkUW0gbEuOzbnfZtqChQdGU3bpNMhleTTqsca9HCV0BgiWCDbhzLZvj_2CvtkdW2R1tWggfBnNZDz8tgTdPBOTrPZMxNYICouFfrgA6pqmGQNeTg9tAWvml4ErUOetJKvaQQo8euPClggzc0SeeRyirrZtE8PnPxLwsItswVTO-X2MVxb82S2TkcYHlggmP-sJbyB5IQo61RGdbJDFrlaSG8wSWykqOvNC7kWDKcYJlggs61JhzH2kmW1P9b93hSESwSb9ydTckhcuIsqRMa_RqgYJFggtIIrUF8_6S4uoGISbwPNM-JnrL5Mq5Gjg5kIkGG8Ae8YJVggaM56o7L3n-ShvGlrumiAaoI94zo-EO9uIw9jBhY2rGMBWCDjrtEFNp3EbuqlUFQVD5MhgAmmC8tc7EuBzny5LOnjkQNYIDqdCZRKRHA_ynbBsEh1UdNTBS501n2FMdXqSRMIu4sIFFggZaKivhhz6IJtKzl_90vTnbU7EDw-DCo2d8UMCY8rj4QYHVggZe-hPAn97VmHRTfja-zPL8yN_tIl_T_vNOwoHPp_eIQAWCCK52ZT1TBl23uD2RGoJoF6iCJdbVxyFniWC4-2dD8LkBgoWCA4PEmAaxXaIJd-hFUvT-AdsYmtU3QuqT_-eoBnueB_XwZYIAv1h8e0Spq70lDhetunoBMyMFIM5TSfk_qGdfBZn_IXGClYIE-JV69EUW-KpEqPnRNaYJAU_dg558ibMVBA77jiFHM3GCBYIAtVXhp58iBpPLLT01MQkMD15khNRfvjLgTABexTE6a1GCpYIJHIB-0WO7bwU3yo_xwbDw_sCbz0waIqOW4Kur8FJhwHC1ggfx_vmZVFe8CUjkJOaazErZSLtyKDwOGNeGCGxCn6O8kXWCBF_mQGAuAlmL2uKIgXWoPaqltbxCfVGSSKEWThPDENShgcWCClyE06BT72WMr32UjgWlKf94pbEOb-yDOm2aOjkAqcXhgyWCDFk3jCntVThpcQ_tF_-KhEPBGlLjQvrCQ5hQuKimQyfQRYIL0MtOh_R1fBOFF7sCZIANqe6Z3X55PnWzEeyCWcdJ1_CVggxpt19mSeWXN_7R8z0ndxGgoRXXJI9wfhmvdRfTMPTn4YGlgg7Mn-pvfHtTSngnyJIGdwhiIJhieBvCER1dtVUdopgnoYMVggh_fOwPxRDer84YFCsPQUTfB22x3AeQ9qzKH6NxUt2oIYK1ggeBVMz0cMIYo-49ZcLnOMUfbPz7a4-qSrjNVjhGM2U58YJ1gge9x6ZIByceFy3KdSulHEH2SHoB3e6TWi5Qd0s70Z8l0OWCC-7vQtq17y4QmbOym6tVD8K9sHgl-Vt-OjTVq1wgRfGxVYIEzO6nS_iqSiVwYgjXy4x9hJVAxhptSIbU-scJf1F-SNGBhYIJC7Ws9czD6TUsKWjpv8MHYle0-1pkfVnTk5gRTlZZXWGBlYIJwU7Q3H0jrd7c96fs9Dq_FghBl_91o8gk0S5zWll-CvDFggPt5RzVWhw3z3hO36maYF8zVSk8QZ6hVZThLMcoXnLAMCWCCSdkkllSfKugieied0v43FqHT5L2ub87gXR53E_grrkhgjWCCHu2lsv2VX13hrwiYgumJ0CqxFxEPKteJcVWY_jIfDyAdYIOdbBrfT2V-Bwzl_k1XUljkLWMqHG3aVq3EF8pWFOujeD1ggUxgPu90U7YVTKo-dgRb0PyETPmYeJzOpyCFdomzp-pJ3b3JnLmlzby4xODAxMy41LjEuYWFtdmGrGCxYIF5PHc8hAulY3pQi4JEEv6I-_DMzslqVj2yGbjB1FkMoGBtYILxo3CyvUV9nIZo6ttyjHomq4goRoGisYTdTe7qmY3ocGB9YINTD6vn8oCVv0nCxwZafdb_a6Yl5z153BGJCjYnyrYxkEFgg0l9KXbZX_0v-lpjbKPqbqCvBbYdSlGGts8exQKOYMbkFWCAKSOLHVH1Lo2VjLeoSoPiJnPfbmXrOd1hPTCQ_7b4AKxgvWCBO-iRhfnp1X8ivD0OBTzYIXFYIoIF7Ia0vqoE1XYH42BJYIGTzfJqZc9fMqZaADOfcnHVBTy2x-5NiFE1eBBRhj4BhEVggd3orojennk39woopFxPiPOu_KSCnDzVgU0gT6sRxcewYLVgg5XZXJVEhvTTVIRhtKTgVxL9UPE9Zb4MiquXFYozS5WwIWCBO9_CC_c__P1ZczlXOqLHIiIsUSzzCOWsXXyTcfiqUdxZYIC68IPFuPbkwCiSfvQpkIt-Ki2mcFH6dCkBTqo9dIX9ebWRldmljZUtleUluZm-haWRldmljZUtleaQBAiABIVggc0l9FdSd1T7xSkjTuILTvcerLberaRsQyXoQVOv_s_wiWCB1A3HhQ6jUSkWW6HXa9UZULG7KRjohdGIDiW123occS2x2YWxpZGl0eUluZm-jZnNpZ25lZMB0MjAyNS0xMS0yNVQwOTowMzoyMVppdmFsaWRGcm9twHQyMDI1LTExLTI1VDA5OjAzOjIxWmp2YWxpZFVudGlswHQyMDI2LTExLTI1VDA5OjAzOjIxWlhAb8emhJa3M6NqFJO6RTSVCDUU7ZVZKYB3QI9VdkRXla740h6MgCACPIJgP-Giwk-WorHjyWLyf-Qp3KvuTW0DQGxkZXZpY2VTaWduZWSiam5hbWVTcGFjZXPYGEGgamRldmljZUF1dGihb2RldmljZVNpZ25hdHVyZYRDoQEmoPZYQGmXitnxaCOnzAaVr1tD3DICIBxfJVjWwhgMKoa0wSb3p2rE4oMntRyy8rHJTUNIs4z3kflnWmgxIurthHCe5UJmc3RhdHVzAA"
      ]
    }
  },
  "presentedPresentations": {
    "annex_c": {
      "type": "mso_mdoc",
      "format": "mso_mdoc",
      "mdoc": {
        "credentialData": {
          "docType": "org.iso.18013.5.1.mDL",
          "org.iso.18013.5.1": {
            "family_name": "Mustermann",
            "given_name": "Erika",
            "age_over_21": true
          }
        },
        "signed": "o2d2ZXJzaW9uYzEuMGlkb2N1bWVudHOBo2dkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGxpc3N1ZXJTaWduZWSiam5hbWVTcGFjZXOhcW9yZy5pc28uMTgwMTMuNS4xg9gYWFmkaGRpZ2VzdElEDWZyYW5kb21QcHkdIBGXsBY5P3-fB_XuQHFlbGVtZW50SWRlbnRpZmllcmtmYW1pbHlfbmFtZWxlbGVtZW50VmFsdWVqTXVzdGVybWFubtgYWFSkaGRpZ2VzdElEGCFmcmFuZG9tUOkhlSIERKk9PgzLUHDYi5RxZWxlbWVudElkZW50aWZpZXJqZ2l2ZW5fbmFtZWxlbGVtZW50VmFsdWVlRXJpa2HYGFhPpGhkaWdlc3RJRARmcmFuZG9tUNMRBcc_Eugx-781mi433v1xZWxlbWVudElkZW50aWZpZXJrYWdlX292ZXJfMjFsZWxlbWVudFZhbHVl9Wppc3N1ZXJBdXRohEOhASahGCFZAfQwggHwMIIBlaADAgECAhAC-KqoT1iaMiYv3VkOIet1MAoGCCqGSM49BAMCMBgxFjAUBgNVBAMMDVRlc3QgSUFDQSBLZXkwHhcNMjUxMTI1MDkwMzIxWhcNMjYxMTI1MDkwMzIxWjAWMRQwEgYDVQQDDAtUZXN0IERTIEtleTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHHSjI_OxXYVINCNXfhmu3eqlbfNUjKXTNWQmrahZU1SXvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hejgcIwgb8wHwYDVR0jBBgwFoAUMbJvgxgCP0Q-aR7AV2U5ROu7tDwwDgYDVR0PAQH_BAQDAgeAMBUGA1UdJQEB_wQLMAkGByiBjF0FAQIwJQYDVR0SBB4wHIYaaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20wLwYDVR0fBCgwJjAkoCKgIIYeaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20vY3JsMB0GA1UdDgQWBBTyxD4KDXT6SMzwBltE9zugMsvISjAKBggqhkjOPQQDAgNJADBGAiEAittNg8nnAfwv6bsVoscw4tFgwgOcpVPtCBtKTfLEKvQCIQCHU_amzLnRaU6ZUDkorbXov4BbXBvkGSjtC-n1xFyKB1kIZ9gYWQhipmd2ZXJzaW9uYzEuMG9kaWdlc3RBbGdvcml0aG1nU0hBLTI1Nmdkb2NUeXBldW9yZy5pc28uMTgwMTMuNS4xLm1ETGx2YWx1ZURpZ2VzdHOicW9yZy5pc28uMTgwMTMuNS4xuCgNWCAxe1tAq3PxEagr7Iab4jHJUTeccIQgctZ510G5p1Q31xghWCBQj1GqNbTmkY0IIgMHWYaNWPopFjCAbAhmgEaAWlX10BguWCBmo5MEl1tQlS1g3qQWDq6UgtagAqvNMwEhgPVPeucprBgwWCDdkUW0gbEuOzbnfZtqChQdGU3bpNMhleTTqsca9HCV0BgiWCDbhzLZvj_2CvtkdW2R1tWggfBnNZDz8tgTdPBOTrPZMxNYICouFfrgA6pqmGQNeTg9tAWvml4ErUOetJKvaQQo8euPClggzc0SeeRyirrZtE8PnPxLwsItswVTO-X2MVxb82S2TkcYHlggmP-sJbyB5IQo61RGdbJDFrlaSG8wSWykqOvNC7kWDKcYJlggs61JhzH2kmW1P9b93hSESwSb9ydTckhcuIsqRMa_RqgYJFggtIIrUF8_6S4uoGISbwPNM-JnrL5Mq5Gjg5kIkGG8Ae8YJVggaM56o7L3n-ShvGlrumiAaoI94zo-EO9uIw9jBhY2rGMBWCDjrtEFNp3EbuqlUFQVD5MhgAmmC8tc7EuBzny5LOnjkQNYIDqdCZRKRHA_ynbBsEh1UdNTBS501n2FMdXqSRMIu4sIFFggZaKivhhz6IJtKzl_90vTnbU7EDw-DCo2d8UMCY8rj4QYHVggZe-hPAn97VmHRTfja-zPL8yN_tIl_T_vNOwoHPp_eIQAWCCK52ZT1TBl23uD2RGoJoF6iCJdbVxyFniWC4-2dD8LkBgoWCA4PEmAaxXaIJd-hFUvT-AdsYmtU3QuqT_-eoBnueB_XwZYIAv1h8e0Spq70lDhetunoBMyMFIM5TSfk_qGdfBZn_IXGClYIE-JV69EUW-KpEqPnRNaYJAU_dg558ibMVBA77jiFHM3GCBYIAtVXhp58iBpPLLT01MQkMD15khNRfvjLgTABexTE6a1GCpYIJHIB-0WO7bwU3yo_xwbDw_sCbz0waIqOW4Kur8FJhwHC1ggfx_vmZVFe8CUjkJOaazErZSLtyKDwOGNeGCGxCn6O8kXWCBF_mQGAuAlmL2uKIgXWoPaqltbxCfVGSSKEWThPDENShgcWCClyE06BT72WMr32UjgWlKf94pbEOb-yDOm2aOjkAqcXhgyWCDFk3jCntVThpcQ_tF_-KhEPBGlLjQvrCQ5hQuKimQyfQRYIL0MtOh_R1fBOFF7sCZIANqe6Z3X55PnWzEeyCWcdJ1_CVggxpt19mSeWXN_7R8z0ndxGgoRXXJI9wfhmvdRfTMPTn4YGlgg7Mn-pvfHtTSngnyJIGdwhiIJhieBvCER1dtVUdopgnoYMVggh_fOwPxRDer84YFCsPQUTfB22x3AeQ9qzKH6NxUt2oIYK1ggeBVMz0cMIYo-49ZcLnOMUfbPz7a4-qSrjNVjhGM2U58YJ1gge9x6ZIByceFy3KdSulHEH2SHoB3e6TWi5Qd0s70Z8l0OWCC-7vQtq17y4QmbOym6tVD8K9sHgl-Vt-OjTVq1wgRfGxVYIEzO6nS_iqSiVwYgjXy4x9hJVAxhptSIbU-scJf1F-SNGBhYIJC7Ws9czD6TUsKWjpv8MHYle0-1pkfVnTk5gRTlZZXWGBlYIJwU7Q3H0jrd7c96fs9Dq_FghBl_91o8gk0S5zWll-CvDFggPt5RzVWhw3z3hO36maYF8zVSk8QZ6hVZThLMcoXnLAMCWCCSdkkllSfKugieied0v43FqHT5L2ub87gXR53E_grrkhgjWCCHu2lsv2VX13hrwiYgumJ0CqxFxEPKteJcVWY_jIfDyAdYIOdbBrfT2V-Bwzl_k1XUljkLWMqHG3aVq3EF8pWFOujeD1ggUxgPu90U7YVTKo-dgRb0PyETPmYeJzOpyCFdomzp-pJ3b3JnLmlzby4xODAxMy41LjEuYWFtdmGrGCxYIF5PHc8hAulY3pQi4JEEv6I-_DMzslqVj2yGbjB1FkMoGBtYILxo3CyvUV9nIZo6ttyjHomq4goRoGisYTdTe7qmY3ocGB9YINTD6vn8oCVv0nCxwZafdb_a6Yl5z153BGJCjYnyrYxkEFgg0l9KXbZX_0v-lpjbKPqbqCvBbYdSlGGts8exQKOYMbkFWCAKSOLHVH1Lo2VjLeoSoPiJnPfbmXrOd1hPTCQ_7b4AKxgvWCBO-iRhfnp1X8ivD0OBTzYIXFYIoIF7Ia0vqoE1XYH42BJYIGTzfJqZc9fMqZaADOfcnHVBTy2x-5NiFE1eBBRhj4BhEVggd3orojennk39woopFxPiPOu_KSCnDzVgU0gT6sRxcewYLVgg5XZXJVEhvTTVIRhtKTgVxL9UPE9Zb4MiquXFYozS5WwIWCBO9_CC_c__P1ZczlXOqLHIiIsUSzzCOWsXXyTcfiqUdxZYIC68IPFuPbkwCiSfvQpkIt-Ki2mcFH6dCkBTqo9dIX9ebWRldmljZUtleUluZm-haWRldmljZUtleaQBAiABIVggc0l9FdSd1T7xSkjTuILTvcerLberaRsQyXoQVOv_s_wiWCB1A3HhQ6jUSkWW6HXa9UZULG7KRjohdGIDiW123occS2x2YWxpZGl0eUluZm-jZnNpZ25lZMB0MjAyNS0xMS0yNVQwOTowMzoyMVppdmFsaWRGcm9twHQyMDI1LTExLTI1VDA5OjAzOjIxWmp2YWxpZFVudGlswHQyMDI2LTExLTI1VDA5OjAzOjIxWlhAb8emhJa3M6NqFJO6RTSVCDUU7ZVZKYB3QI9VdkRXla740h6MgCACPIJgP-Giwk-WorHjyWLyf-Qp3KvuTW0DQGxkZXZpY2VTaWduZWSiam5hbWVTcGFjZXPYGEGgamRldmljZUF1dGihb2RldmljZVNpZ25hdHVyZYRDoQEmoPZYQGmXitnxaCOnzAaVr1tD3DICIBxfJVjWwhgMKoa0wSb3p2rE4oMntRyy8rHJTUNIs4z3kflnWmgxIurthHCe5UJmc3RhdHVzAA",
        "docType": "org.iso.18013.5.1.mDL",
        "signature": {
          "type": "signature-cose",
          "signerKey": {
            "type": "jwk",
            "jwk": {
              "kty": "EC",
              "crv": "P-256",
              "x": "cdKMj87FdhUg0I1d-Ga7d6qVt81SMpdM1ZCatqFlTVI",
              "y": "XvzbqIzS_DfoJhoTfp64x4DJbMZm57riYM8b1g1a5hc"
            }
          },
          "x5cList": [
            "MIIB8DCCAZWgAwIBAgIQAviqqE9YmjImL91ZDiHrdTAKBggqhkjOPQQDAjAYMRYwFAYDVQQDDA1UZXN0IElBQ0EgS2V5MB4XDTI1MTEyNTA5MDMyMVoXDTI2MTEyNTA5MDMyMVowFjEUMBIGA1UEAwwLVGVzdCBEUyBLZXkwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARx0oyPzsV2FSDQjV34Zrt3qpW3zVIyl0zVkJq2oWVNUl7826iM0vw36CYaE36euMeAyWzGZue64mDPG9YNWuYXo4HCMIG/MB8GA1UdIwQYMBaAFDGyb4MYAj9EPmkewFdlOUTru7Q8MA4GA1UdDwEB/wQEAwIHgDAVBgNVHSUBAf8ECzAJBgcogYxdBQECMCUGA1UdEgQeMByGGmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tMC8GA1UdHwQoMCYwJKAioCCGHmh0dHBzOi8vaXNzdWVyLmV4YW1wbGUuY29tL2NybDAdBgNVHQ4EFgQU8sQ+Cg10+kjM8AZbRPc7oDLLyEowCgYIKoZIzj0EAwIDSQAwRgIhAIrbTYPJ5wH8L+m7FaLHMOLRYMIDnKVT7QgbSk3yxCr0AiEAh1P2psy50WlOmVA5KK216L+AW1wb5Bko7Qvp9cRcigc="
          ]
        },
        "format": "mso_mdoc",
        "mso": {
          "version": "1.0",
          "digestAlgorithm": "SHA-256",
          "valueDigests": {
            "org.iso.18013.5.1": {
              "0": [
                -118,
                -25,
                102,
                83,
                -43,
                48,
                101,
                -37,
                123,
                -125,
                -39,
                17,
                -88,
                38,
                -127,
                122,
                -120,
                34,
                93,
                109,
                92,
                114,
                22,
                120,
                -106,
                11,
                -113,
                -74,
                116,
                63,
                11,
                -112
              ],




         },
          "docType": "org.iso.18013.5.1.mDL",
          "validityInfo": {
            "signed": "2025-11-25T09:03:21Z",
            "validFrom": "2025-11-25T09:03:21Z",
            "validUntil": "2026-11-25T09:03:21Z"
          }
        }
      }
    ]
  }
}