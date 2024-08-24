import IValidationError from "./renderable/schema/IValidationError";
import {
  ValidationErrorType,
  IValidationErrorPart,
} from "./renderable/schema/IValidationError";

export default class ValidationHandler {
  constructor() {}
  static async getError(
    part: number,
    errorType: ValidationErrorType,
    culture: "fa" | "en"
  ): Promise<IValidationError> {
    const validationHandler = new ValidationHandler();
    let sentenceId = validationHandler.findSentenceIdByErrorType(errorType);
    return {
      part: part,
      title: errorType,
      errors: [
        {
          type: errorType,
          description: await validationHandler.fetchSentenceId(
            sentenceId,
            culture
          ),
        },
      ],
    };
  }
  static async getErrorElement(
    errorType: ValidationErrorType,
    culture: "fa" | "en",
    params : any
  ): Promise<IValidationErrorPart> {
    const validationHandler = new ValidationHandler();
    let sentenceId = validationHandler.findSentenceIdByErrorType(errorType);
    return {
      type: errorType,
      description: await validationHandler.fetchSentenceId(sentenceId, culture),
      params : params
    };
  }
  async fetchSentenceId(id: string, culture: string): Promise<string> {
    const response = await fetch(`http://url-of-api/${culture}/${id}`);
    const data = await response.json();
    return data.title as string;
  }
  findSentenceIdByErrorType(errorType: string): string {
    let sentenceId: string;
    switch (errorType) {
      case "required":
        sentenceId = "test";
        break;
      case "regex":
        sentenceId = "test";
        break;
      case "type":
        sentenceId = "test";
        break;
      case "length":
        sentenceId = "test";
        break;
      case "mime":
        sentenceId = "test";
        break;
      case "mime-size":
        sentenceId = "test";
        break;
      case "range":
        sentenceId = "test";
        break;
      case "size":
        sentenceId = "test";
        break;
      case "sub-schema":
        sentenceId = "test";
        break;
      default:
        throw new Error("invalid validation");
    }
    return sentenceId;
  }
}
