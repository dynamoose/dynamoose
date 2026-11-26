// A large e-commerce order schema for the benchmark: about 60 top-level attributes, two wide nested
// objects (around 30 attributes each, with `validate` functions), an array of objects with multi-type
// attributes and a nested list, an object with its own `validate` and `set`, schemaless objects kept
// through `saveUnknown`, a Set, `enum` and `required` settings (also `required: undefined`, as schema
// generators emit it), global indexes and timestamps stored as ISO strings.
const crypto = require("crypto");

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const acceptAny = () => true;
const isSafeString = (value) => typeof value === "string" && !/[<>]/.test(value);
const isCountryCode = (value) => typeof value === "string" && (!value || /^[A-Z]{2}$/.test(value));
const isSessionId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(value);
const isHexId = (value) => typeof value === "string" && /^[0-9a-fA-F]{40}$/.test(value);
const isFinancingSelection = (value) => isRecord(value) &&
	[true, false, "true", "false"].includes(value.accepted) &&
	(value.termCount === undefined || !Number.isNaN(Number(value.termCount))) &&
	(value.planType === undefined || typeof value.planType === "string");
// Keeps the known keys only, with `accepted` as a boolean and `termCount` as a number.
function conformFinancingSelection (value) {
	if (!isFinancingSelection(value)) {
		return value;
	}
	const data = {"accepted": value.accepted === true || value.accepted === "true"};
	if (value.termCount !== undefined) {
		data.termCount = Number(value.termCount);
	}
	if (value.planType !== undefined) {
		data.planType = value.planType;
	}
	return data;
}

const optional = (type, settings = {}) => ({type, "required": undefined, ...settings});
const required = (type, settings = {}) => ({type, "required": true, ...settings});

// The client context of a request. A new object per call, so the two attributes that use it do not
// share definition objects.
const clientContext = () => ({
	"ip": optional([String]),
	"userAgent": optional(String, {"validate": isSafeString}),
	"comment": optional(String, {"validate": isSafeString}),
	"countryCode": optional(String, {"validate": isCountryCode}),
	"lang": optional(String),
	"deviceType": optional(String, {"enum": ["desktop", "mobile", "smartTV", "tablet"]}),
	"deviceModel": optional(String),
	"browser": optional(String),
	"browserVersion": optional(String),
	"browserAccept": optional(String),
	"os": optional(String),
	"osVersion": optional(String),
	"source": optional(String),
	"sourceVersion": optional(String),
	"colorDepth": optional(String),
	"screenHeight": optional(String),
	"screenWidth": optional(String),
	"timezoneOffset": optional(String),
	"timezoneName": optional(String),
	"devicePixelRatio": optional(String),
	"hardwareConcurrency": optional(String),
	"deviceMemory": optional(String),
	"maxTouchPoints": optional(String),
	"platform": optional(String),
	"languages": optional(String),
	"fingerprint": optional(String),
	"sessionId": optional(String, {"validate": isSessionId})
});

const createOrderSchema = (dynamoose) => new dynamoose.Schema(
	{
		"id": required(String, {"hashKey": true}),
		"orderNumber": required(String, {"index": {"name": "orderNumber-index", "type": "global"}}),
		"channel": required(String, {"enum": ["WEB", "MOBILE", "POS", "MARKETPLACE", "PHONE", "API"]}),
		"cartId": optional(String),
		"externalOrderId": optional(String),
		"storeId": optional(String),
		"warehouseId": optional(String, {"validate": isHexId}),
		"registerId": optional(String),
		"status": required(String, {"enum": ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING", "PACKED", "SHIPPED", "PARTIALLY_SHIPPED", "DELIVERED", "CANCELED", "RETURNED", "REFUNDED", "FAILED"]}),
		"statusCode": optional(String),
		"statusMessage": optional(String),
		"fulfillmentStatusCode": optional(String),
		"fulfillmentStatusMessage": optional(String),
		"carrierStatusCode": optional(String),
		"carrierStatusMessage": optional(String),
		"customerId": required(String, {"index": {"name": "externalOrderId-index", "type": "global", "rangeKey": "externalOrderId"}}),
		"sellerId": optional(String),
		"shipmentGroupId": optional(String),
		"subscriptionId": optional(String),
		"relatedOrders": optional(Set, {"schema": [required(String)]}),
		"lastReturnId": optional(String),
		"parentOrderId": optional(String),
		"lastShipmentId": optional(String),
		"lastInvoiceId": optional(String),
		"lastCancelId": optional(String),
		"paymentMethodId": optional(String),
		"savedPaymentMethodId": optional(String),
		"savePaymentMethod": optional(Boolean),
		"couponId": optional(String),
		"autoReorder": optional(Boolean),
		"details": required(Object, {"validate": acceptAny}),
		"browserContext": optional(Object, {"schema": clientContext()}),
		"requestContext": optional(Object, {"schema": {
			...clientContext(),
			"apiKeyId": optional(String),
			"partnerKeyId": optional(String),
			"userId": optional(String),
			"userEmail": optional(String),
			"userName": optional(String),
			"grantId": optional(String),
			"clientId": optional(String),
			"verificationRequested": optional(Boolean)
		}}),
		"checkoutOpenedAt": optional(Number),
		"cartSnapshot": optional(Object, {"validate": isRecord}),
		"pricingRequest": optional(Object, {"validate": isRecord}),
		"pricingResponse": optional(Object, {"validate": isRecord}),
		"financing": optional(Object, {"schema": {
			"planRef": optional(String),
			"offers": optional(Array, {"schema": [
				{
					"type": Object,
					"schema": {
						"fee": optional([String, Number]),
						"feeType": optional([String, Number]),
						"firstPaymentAmount": optional([String, Number]),
						"planType": optional(String),
						"paymentAmount": optional([String, Number]),
						"termCount": optional([String, Number]),
						"apr": optional([String, Number]),
						"totalAmount": optional([String, Number]),
						"interestRate": optional([String, Number]),
						"dueDates": optional(Array, {"schema": [{"type": String}]})
					}
				}
			]}),
			"selection": optional(Object, {
				"schema": {
					"accepted": required([Boolean, String]),
					"termCount": optional(Number),
					"planType": optional(String)
				},
				"validate": isFinancingSelection,
				"set": conformFinancingSelection
			}),
			"lenderName": optional(String),
			"lenderCode": optional([String, Number]),
			"termsText": optional(String),
			"disclosureFlag": optional([String, Number]),
			"cardInfo": optional(String)
		}}),
		"financingOffered": optional(Boolean),
		"carrierTrackingId": optional(String, {"index": {"name": "carrierTrackingId-index", "type": "global"}}),
		"confirmationResponse": optional(Object, {"validate": isRecord}),
		"carrierWebhookResponse": optional(Object, {"validate": isRecord}),
		"storeWebhookResponse": optional(Object, {"validate": isRecord}),
		"fraudReviewData": optional(Object, {"validate": isRecord}),
		"addressValidationData": optional(Object, {"validate": isRecord}),
		"notification": optional(Object, {"schema": {
			"status": required(String, {"enum": ["PENDING", "SENT", "FAILED"]}),
			"statusCode": optional(String),
			"statusMessage": optional(String)
		}}),
		"emailReceiptSent": optional(Boolean),
		"smsReceiptSent": optional(Boolean),
		"guestCheckout": optional(Boolean),
		"reservationExpireAt": optional(Number),
		"expireAt": required(Number),
		"marketplaceId": optional(String),
		"marketplaceGroupId": optional(String),
		"disputed": optional(Boolean)
	},
	{
		"saveUnknown": ["details.**", "cartSnapshot.**", "pricingRequest.**", "pricingResponse.**", "confirmationResponse.**", "carrierWebhookResponse.**", "storeWebhookResponse.**", "fraudReviewData.**", "addressValidationData.**"],
		"timestamps": {
			"createdAt": {"createdAt": {"type": {"value": Date, "settings": {"storage": "iso"}}}},
			"updatedAt": {"updatedAt": {"type": {"value": Date, "settings": {"storage": "iso"}}}}
		}
	}
);

// A paid web order with one return. All values are invented: example.com addresses, documentation IP ranges.
function generateOrderData () {
	const id = crypto.randomBytes(20).toString("hex");
	const returnId = crypto.randomBytes(20).toString("hex");
	const customerId = crypto.randomUUID();
	const externalOrderId = `${crypto.randomInt(1e12)}`;
	const customer = {"name": "Jane Tester", "email": "jane.tester@example.com", "phone": "+10000000000"};
	const store = {"name": "EXAMPLE STORE", "country": "US"};
	const address = {"line1": "1 Example Street", "city": "Springfield", "state": "IL", "zip": "62701", "country": "US"};
	const lines = [
		{"sku": "SKU-1001", "name": "Coffee mug", "quantity": 2, "unitPrice": 1200, "tax": 192},
		{"sku": "SKU-2002", "name": "Tea towel", "quantity": 1, "unitPrice": 1850, "tax": 148}
	];
	const browserContext = {
		"ip": "192.0.2.10",
		"userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
		"countryCode": "US",
		"lang": "en",
		"deviceType": "desktop",
		"browser": "Chrome",
		"browserVersion": "129.0.0.0",
		"browserAccept": "text/html,application/xhtml+xml",
		"os": "Mac OS",
		"osVersion": "10.15.7",
		"colorDepth": "24",
		"screenHeight": "1117",
		"screenWidth": "1728",
		"timezoneOffset": "300",
		"timezoneName": "America/Chicago",
		"languages": "en-US,en",
		"fingerprint": crypto.randomBytes(16).toString("hex"),
		"sessionId": crypto.randomBytes(16).toString("hex")
	};
	return {
		id,
		"orderNumber": id,
		"channel": "WEB",
		"cartId": browserContext.sessionId,
		externalOrderId,
		"storeId": crypto.randomUUID(),
		"status": "PAID",
		"statusCode": "P000",
		"statusMessage": "Payment captured",
		"fulfillmentStatusCode": "0",
		"fulfillmentStatusMessage": "Waiting for packing",
		"carrierStatusCode": "00",
		"carrierStatusMessage": "Label created",
		customerId,
		"sellerId": crypto.randomUUID(),
		"relatedOrders": new Set([returnId]),
		"lastReturnId": returnId,
		"paymentMethodId": crypto.randomBytes(20).toString("hex"),
		"savePaymentMethod": false,
		"autoReorder": true,
		"details": {
			"amount": 4250,
			"amountUSD": 4250,
			"currency": "USD",
			"billingAddress": {"name": customer.name, "email": customer.email, "phone": customer.phone, address},
			"shippingAddress": {"name": customer.name, address},
			"shippingMethod": "standard",
			"confirmationUrl": "https://store.example.com/orders/confirmation",
			"cancelUrl": "https://store.example.com/cart",
			customer,
			"description": `Order ${externalOrderId}`,
			externalOrderId,
			lines,
			"discounts": [{"code": "WELCOME10", "amount": 305}],
			store,
			"expireAt": 1760500000,
			"riskScore": 12.5,
			"metadata": {"cartId": "cart-1001", "campaign": "autumn"}
		},
		browserContext,
		"requestContext": {
			"ip": "192.0.2.20",
			"userAgent": "ExampleClient/2.4.0",
			"source": "ExampleClient",
			"sourceVersion": "2.4.0",
			"countryCode": "US",
			"apiKeyId": "key_000000"
		},
		"checkoutOpenedAt": 1760400030,
		"cartSnapshot": {
			"lines": lines,
			"currency": "USD",
			"subtotal": 4250,
			"customer": customer,
			"allowedShippingMethods": ["standard", "express", "pickup"]
		},
		"pricingRequest": {
			"orderId": id,
			"currency": "USD",
			"lines": lines.map((line) => ({"sku": line.sku, "quantity": line.quantity})),
			"destination": {"country": "US", "zip": "62701"},
			"coupon": "WELCOME10"
		},
		"pricingResponse": {
			"subtotal": 4250,
			"discount": 305,
			"tax": 340,
			"shipping": 499,
			"total": 4784,
			"currency": "USD",
			"rates": {"tax": "0.0800", "region": "US-IL"},
			"raw": {"r1": id, "r2": "4784", "r3": "USD", "r4": "0", "r5": "ok"}
		},
		"carrierTrackingId": crypto.randomBytes(16).toString("hex"),
		"confirmationResponse": {
			id,
			"amount": 4784,
			"currency": "USD",
			externalOrderId,
			customerId,
			"status": "PAID",
			"statusCode": "P000",
			"statusMessage": "Payment captured",
			customer,
			store,
			"nextAction": {"type": "COMPLETE", "redirectUrl": `https://store.example.com/orders/${id}`},
			"createdAt": 1760400000,
			"updatedAt": 1760400060
		},
		"notification": {"status": "SENT", "statusCode": "200"},
		"emailReceiptSent": true,
		"guestCheckout": true,
		"expireAt": 3299040211
	};
}

module.exports = {
	"name": "order",
	"create": createOrderSchema,
	"data": generateOrderData,
	"key": (data) => ({"id": data.id}),
	"update": () => ({"status": "SHIPPED", "statusCode": "S000", "statusMessage": "Shipped", "notification": {"status": "PENDING"}}),
	"nestedUpdate": () => ({"$SET": {"notification.status": "SENT", "details.refundedAmount": 4250}})
};
