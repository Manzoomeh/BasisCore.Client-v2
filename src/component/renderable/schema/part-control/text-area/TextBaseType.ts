import Question from "../../question/Question";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import { IQuestionPart, IPartCollection } from "../../ISchema";
import { IUserActionPart } from "../../IUserActionResult";

export interface ITestElement {
  value: string;
}

export default abstract class TextBaseType<
  TTextElementType extends ITestElement
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
    if (answer) {
      this.input.value = answer.values[0].value;
    }
  }

  public getAdded(): IUserActionPart {
    let retVal = null;
    if (!this.answer) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.input.value,
          },
        ],
      };
    }
    return retVal;
  }

  public getEdited(): IUserActionPart {
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
    return retVal;
  }
  public getDeleted(): IUserActionPart {
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
    return retVal;
  }
}
