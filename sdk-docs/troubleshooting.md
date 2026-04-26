# Troubleshooting

## `createPaywall requires a product API key`

The value passed to `createPaywall(apiKey)` is empty.

Check that your application loaded `PRODUCT_API_KEY` and that the key was copied from the dashboard product.

## `503 Product configuration unavailable`

The middleware could not fetch product config from Glyde.

Check:

- The [Glyde dashboard](https://glyde-seven.vercel.app) is reachable, or `DASHBOARD_BACKEND_URL` points to your local/self-hosted dashboard API.
- The product API key is valid.
- The dashboard route `GET /api/gateway/products/by-key/:apiKey` returns `200`.

## `402 Product is inactive`

The dashboard product exists but has `status: "inactive"`.

Set the product to active in the dashboard before using it in production traffic.

## `402 Product payment recipient is invalid`

The dashboard returned an invalid `payTo` value.

Check the merchant receiving wallet in dashboard settings. It must be a valid `0x` Ethereum-style address.

## `402 Invalid payment recipient`

The agent signed a payment for a different recipient than the current dashboard product config.

Common causes:

- The merchant changed the receiving wallet after the agent fetched an older challenge.
- The client built the payment payload manually and used the wrong `to` address.
- The request is using the wrong product API key.

Fetch a fresh challenge and retry.

## `402 Insufficient payment amount`

The signed `authorization.value` is lower than the dashboard product `price`.

Remember that values use USDC base units:

```text
0.01 USDC = 10000
1.00 USDC = 1000000
```

## `402 Payment authorization expired or not yet valid`

The current server time is outside the signed authorization window.

Check:

- The client uses the `maxTimeoutSeconds` from the challenge.
- Server and client clocks are reasonably synchronized.
- The retry happens soon after the challenge is issued.

## `402 Payment settlement failed`

The middleware could not settle the payment on-chain.

Check:

- `PAYWALL_PRIVATE_KEY` is set and belongs to the intended facilitator wallet.
- The facilitator wallet has AVAX for gas on the selected network.
- `RPC_URL` points to the same network returned by the dashboard product.
- The agent wallet has enough USDC.
- The signature matches the authorization payload.
- The nonce has not already been used.

## Payments Settle But Do Not Show Under the Product

The dashboard matches payments by `resource`.

Check that the dashboard product `resource` is the expected resource for the endpoint. The middleware records `product.resource`, not `req.path`.
