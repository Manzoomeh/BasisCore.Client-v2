import Question from "../../question/Question";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";

export interface ITextElement {
  value: string;
  placeholder: string
}

export default abstract class TextBaseType<
  TTextElementType extends ITextElement
> extends EditableQuestionPart {
  protected readonly input: TTextElementType;
  constructor(
    part: IQuestionPart,
    partLayout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, partLayout, owner, answer);
    this.input = this.element.querySelector<any>("[data-bc-text-input]");
    if (this.isDisabled) {
      (this.input as any as Element).setAttribute("disabled", "");
    } else if (this.isReadonly) {
      (this.input as any as Element).setAttribute("readonly", "");
    }
    if (answer) {
      this.input.value = answer.values[0].value.time ?? answer.values[0].value;
    }
    if (part.placeHolder) {
      this.input.placeholder = part.placeHolder

    }
  }

  public async getValidationErrorsAsync(): Promise<IValidationError> {
    return Promise.resolve(await this.ValidateValue(this.input.value));
  }

  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer) {
      if (this.input.value.length > 0) {
        retVal = {
          part: this.part.part,
          values: [
            {
              value: this.input.value,
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const changed = this.input.value != this.answer.values[0].value;
      if (changed && this.input.value.length > 0) {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: this.input.value,
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const changed = this.input.value != this.answer.values[0].value;
      if (changed && this.input.value.length == 0) {
        retVal = {
          part: this.part.part,
          values: [
            {
              id: this.answer.values[0].id,
              value: this.input.value,
            },
          ],
        };
      }
    }
    return Promise.resolve(retVal);
  }

  public getValuesAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.input.value.length > 0) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.input.value,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }
}
