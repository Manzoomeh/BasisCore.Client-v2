import Question from "../question/Question";
import layout from "./assets/layout.html";
import Util from "../../../../Util";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart } from "../IQuestionSchema";
import { IUserActionPart } from "../IUserActionResult";
import IValidationError, { IValidationErrorPart } from "../IValidationError";
import ValidationHandler from "../../../ValidationHandler";

export default abstract class QuestionPart {
  public readonly part: IQuestionPart;
  protected readonly element: Element;
  protected readonly owner: Question;
  protected readonly answer: IPartCollection;
  private readonly _validationElement: HTMLUListElement;

  public get isDisabled(): boolean {
    return this.owner.question.disabled || (this.part.disabled && this.answer)
      ? true
      : false;
  }
  public get isReadonly(): boolean {
    return this.owner.question.parts.length > 1 && this.part.readonly
      ? true
      : false;
  }
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

  protected async formatStringAsync(): Promise<string> {
    const queryStringParams =
      await this.owner.options.getQueryStringParamsAsync();
    const data = {
      prpId: this.owner.question.prpId,
      part: this.part.part,
      ...queryStringParams,
    };
    const url = Util.formatString(this.part.link, data);
    return url;
  }

  protected async ValidateValue(
    userValue: any | Array<any>,
    addSubSchemaError: boolean = false
  ): Promise<IValidationError> {
    const errors: Array<IValidationErrorPart> = [];
    let retVal: IValidationError = null;
    if (addSubSchemaError) {
      errors.push(await ValidationHandler.getErrorElement("sub-schema"));
    }
    const isArray = Array.isArray(userValue);
    const hasValue = isArray
      ? userValue && userValue.length > 0
      : userValue && userValue.toString() != "";
    if (this.part.validations) {
      try {
        if (this.part.validations.required) {
          if (!hasValue) {
            errors.push(await ValidationHandler.getErrorElement("required"));
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
              errors.push(
                await ValidationHandler.getErrorElement("type", null, [
                  this.part.validations.dataType,
                ])
              );
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
              errors.push(ValidationHandler.getErrorElement("regex"));
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
            //@ts-expect-error
            errors.push(await ValidationHandler.getErrorElement("length",null,[
                this.part.validations.minLength ?? null,
                this.part.validations.maxLength ?? null,
              ]));
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
              //@ts-expect-error
              errors.push(
                await ValidationHandler.getErrorElement("range", null, [
                  this.part.validations.min ?? null,
                  this.part.validations.max ?? null,
                ])
              );
            }
          } catch (ex) {
            console.error("Error in apply min and max validation", ex);
          }
        }
        if (this.part.validations.size && isArray) {
          try {
            let sizeOk = true;
            let sumSize = 0;
            userValue.forEach((file, index) => {
              sumSize += file.size;
            });
            sizeOk = this.part.validations.size >= sumSize;
            if (!sizeOk) {
              //@ts-expect-error
              errors.push(await ValidationHandler.getErrorElement("size",null,[this.formatBytes(this.part.validations.size)]));
            }
          } catch (ex) {
            console.error("Error in apply size validation", ex);
          }
        }
        if (this.part.validations.mimes && isArray) {
          try {
            let mimeOk = true;
            let mimeSizeOk = true;
            const mimes = this.part.validations.mimes;
            userValue.forEach((file) => {
              const typeFile = file.type;
              const sizeFile = file.size;
              var searchMime = mimes.filter((m) => m.mime === typeFile);
              if (searchMime.length > 0) {
                mimeSizeOk =
                  searchMime[0].minSize <= sizeFile &&
                  sizeFile <= searchMime[0].maxSize;
              } else {
                mimeOk = false;
              }
            });

            if (!mimeOk) {
              const mimesArray = [];
              mimes.forEach((mime) => {
                mimesArray.push(mime.mime);
              });
              //@ts-ignore
              errors.push(await ValidationHandler.getErrorElement("mime",null,[mimesArray]);
            }

            if (!mimeSizeOk) {
              let mimeSizeArray = "";
              mimes.forEach((mime) => {
                mimeSizeArray += ` ${mime.mime} : ${this.formatBytes(
                  mime.minSize
                )} - ${this.formatBytes(mime.maxSize)} , `;
              });
              mimeSizeArray = mimeSizeArray.substring(
                0,
                mimeSizeArray.length - 2
              );
              errors.push(await ValidationHandler.getErrorElement("mime-size",null,[mimeSizeArray]));
            }
          } catch (ex) {
            console.error("Error in apply size validation", ex);
          }
        }
      }
    }
    if (errors.length > 0) {
      retVal = {
        part: this.part.part,
        title: this.part.caption,
        errors: errors,
      };
    }
    this.updateUIAboutError(retVal);
    return retVal;
  }

  public updateUIAboutError(retVal: IValidationError) {
    if (retVal) {
      this.element.setAttribute("data-bc-invalid", "");
      let str = "";
      retVal.errors.forEach((error) => {
        // str += `<li> * ${error.type} ${
        //   error.params ? " - [" + error.params.join(",") + "]" : ""
        // }</li>`;
        str += `<li> * ${error.description} </li>`;
      });
      this._validationElement.innerHTML = str;
    } else {
      this.element.removeAttribute("data-bc-invalid");
      this._validationElement.innerHTML = "";
    }
  }

  private formatBytes(bytes: number, decimals: number = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  public abstract getValidationErrorsAsync(): Promise<IValidationError>;
  public abstract getAddedAsync(): Promise<IUserActionPart>;
  public abstract getEditedAsync(): Promise<IUserActionPart>;
  public abstract getDeletedAsync(): Promise<IUserActionPart>;
  public abstract getValuesAsync(): Promise<IUserActionPart>;
}
