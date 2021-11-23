import Question from "../question/Question";
import layout from "./assets/layout.html";
import Util from "../../../../Util";
import { IQuestionPart, IPartCollection } from "../ISchema";
import {
  IUserActionPart,
  IValidationError,
  IValidationErrorPart,
  ValidationErrorType,
} from "../IUserActionResult";

export default abstract class QuestionPart {
  public readonly part: IQuestionPart;
  protected readonly element: Element;
  protected readonly owner: Question;
  protected readonly answer: IPartCollection;

  constructor(
    part: IQuestionPart,
    partLayout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    this.owner = owner;
    this.answer = answer;
    this.part = part;
    this.element = Util.parse(layout).querySelector("[data-bc-part]");
    this.element.innerHTML = partLayout;
    this.owner.element.appendChild(this.element);
    this.element.setAttribute("data-bc-part-related-cell", "");
  }

  protected formatString(): string {
    const data = {
      prpId: this.owner.question.prpId,
      part: this.part.part,
    };
    const url = Util.formatString(this.part.link, data);
    return url;
  }

  protected Validate(userValue: any): Array<IValidationErrorPart> {
    const retVal: Array<IValidationErrorPart> = [];
    const hasValue = userValue && userValue.toString() != "";
    if (this.part.validations) {
      try {
        if (this.part.validations.required) {
          if (!hasValue) {
            retVal.push({
              type: "required",
            });
          }
        }
      } catch (ex) {
        console.error("Error in validation", ex);
      }
      if (hasValue) {
        if (this.part.validations.dataType) {
          try {
            const ok = (
              this.part.validations.dataType === "int"
                ? /^\d+$/
                : /^[+-]?\d+(\.\d+)?$/
            ).test(userValue.toString());
            if (!ok) {
              retVal.push({
                type: "type",
                params: [this.part.validations.dataType],
              });
            }
          } catch (ex) {
            console.error("Error in validation", ex);
          }
        }
        if (this.part.validations.regex) {
          try {
            if (
              new RegExp(this.part.validations.regex).test(userValue.toString())
            ) {
              retVal.push({
                type: "regex",
                params: [this.part.validations.dataType],
              });
            }
          } catch (ex) {
            console.error("Error in validation", ex);
          }
        }
        try {
          let lengthOk = true;
          if (this.part.validations.minLength) {
            lengthOk = userValue.length >= this.part.validations.minLength;
          }
          if (lengthOk && this.part.validations.maxLength) {
            lengthOk = userValue.length <= this.part.validations.maxLength;
          }
          if (!lengthOk) {
            retVal.push({
              type: "length",
              params: [
                this.part.validations.minLength,
                this.part.validations.maxLength,
              ],
            });
          }
        } catch (ex) {
          console.error("Error in validation", ex);
        }
        try {
          let rangeOk = true;
          if (this.part.validations.min) {
            rangeOk = userValue >= this.part.validations.min;
          }
          if (rangeOk && this.part.validations.max) {
            rangeOk = userValue <= this.part.validations.max;
          }
          if (!rangeOk) {
            retVal.push({
              type: "range",
              params: [this.part.validations.min, this.part.validations.max],
            });
          }
        } catch (ex) {
          console.error("Error in validation", ex);
        }
      }
    }
    if (retVal.length > 0) {
      this.element.setAttribute("data-bc-invalid", "");
    } else {
      this.element.removeAttribute("data-bc-invalid");
    }
    return retVal;
  }

  public abstract getValidationErrors(): IValidationError;
  public abstract getAdded(): IUserActionPart;
  public abstract getEdited(): IUserActionPart;
  public abstract getDeleted(): IUserActionPart;
}
