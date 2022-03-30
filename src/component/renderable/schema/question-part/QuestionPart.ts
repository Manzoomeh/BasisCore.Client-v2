import Question from "../question/Question";
import layout from "./assets/layout.html";
import Util from "../../../../Util";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart } from "../IQuestionSchema";
import { IUserActionPart } from "../IUserActionResult";
import IValidationError, { IValidationErrorPart } from "../IValidationError";

export default abstract class QuestionPart {
  public readonly part: IQuestionPart;
  protected readonly element: Element;
  protected readonly owner: Question;
  protected readonly answer: IPartCollection;
  private readonly _validationElement: HTMLUListElement;

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
    this._validationElement = this.element.querySelector(
      "[data-bc-validation-part]"
    );
    if (this.part.cssClass) {
      this.element.classList.add(this.part.cssClass);
    }
    this.element.querySelector("[data-bc-content]").outerHTML = partLayout;
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

  protected ValidateValue(userValue: any | Array<any>): IValidationError {
    const errors: Array<IValidationErrorPart> = [];
    let retVal: IValidationError = null;
    const isArray = Array.isArray(userValue);
    const hasValue = isArray
      ? userValue && userValue.length > 0
      : userValue && userValue.toString() != "";
    if (this.part.validations) {
      try {
        if (this.part.validations.required) {
          if (!hasValue) {
            errors.push({
              type: "required",
            });
          }
        }
      } catch (ex) {
        console.error("Error in apply required validation", ex);
      }
      if (hasValue) {
        if (this.part.validations.dataType && !isArray) {
          try {
            const ok = (
              this.part.validations.dataType === "int"
                ? /^[+-]?\d+$/
                : /^[+-]?\d+(\.\d+)?$/
            ).test(userValue.toString());
            if (!ok) {
              errors.push({
                type: "type",
                params: [this.part.validations.dataType],
              });
            }
          } catch (ex) {
            console.error("Error in apply data type validation", ex);
          }
        }
        if (this.part.validations.regex && !isArray) {
          try {
            if (
              !new RegExp(this.part.validations.regex).test(
                userValue.toString()
              )
            ) {
              errors.push({
                type: "regex",
                params: [this.part.validations.regex, userValue],
              });
            }
          } catch (ex) {
            console.error("Error in apply regex validation", ex);
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
            errors.push({
              type: "length",
              params: [
                this.part.validations.minLength ?? null,
                this.part.validations.maxLength ?? null,
              ],
            });
          }
        } catch (ex) {
          console.error(
            "Error in apply min length and max length validation",
            ex
          );
        }
        if (!isArray) {
          try {
            let rangeOk = true;
            if (this.part.validations.min) {
              rangeOk = userValue >= this.part.validations.min;
            }
            if (rangeOk && this.part.validations.max) {
              rangeOk = userValue <= this.part.validations.max;
            }
            if (!rangeOk) {
              errors.push({
                type: "range",
                params: [
                  this.part.validations.min ?? null,
                  this.part.validations.max ?? null,
                ],
              });
            }
          } catch (ex) {
            console.error("Error in apply min and max validation", ex);
          }
        }
      }
      if (errors?.length > 0) {
        retVal = {
          part: this.part.part,
          title: this.part.caption,
          errors: errors,
        };
      }
    }
    if (retVal) {
      this.element.setAttribute("data-bc-invalid", "");
      var str = "";
      retVal.errors.forEach((error) => {
        str += `<li>${error.type} ${
          error.params ? " - [" + error.params.join(",") + "]" : ""
        }</li>`;
      });
      this._validationElement.innerHTML = str;
    } else {
      this.element.removeAttribute("data-bc-invalid");
      this._validationElement.innerHTML = "";
    }
    return retVal;
  }

  public abstract getValidationErrors(): IValidationError;
  public abstract getAdded(): IUserActionPart;
  public abstract getEdited(): IUserActionPart;
  public abstract getDeleted(): IUserActionPart;
}
