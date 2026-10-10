import {CustomError} from "dynamoose-utils";

/**
 * Thrown by `dynamoose.transaction` with `returnItems` when the write succeeded but the written items could not be returned (reading them back or
 * building them failed). The data is saved, so the write must not be retried; `cause` holds the original error.
 */
class TransactionReadError extends Error {
	name = "TransactionReadError";
	committed = true;
	cause: unknown;

	constructor (cause: unknown) {
		super(`The transaction was written, but returning the written items failed${cause instanceof Error ? `: ${cause.message}` : ""}`);
		this.cause = cause;
	}
}

// Defined here rather than in dynamoose-utils, which is published separately.
export default {...CustomError, TransactionReadError};
