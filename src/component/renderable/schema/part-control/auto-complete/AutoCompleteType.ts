import "./assets/style";
import Question from "../../question/Question";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import Util from "../../../../../Util";
import { IQuestionPart, IPartCollection, IFixValue } from "../../ISchema";
import { IUserActionPart, IValidationError } from "../../IUserActionResult";
import { IEditParams } from "../../IFormMakerOptions";

export default abstract class AutoCompleteType extends EditableQuestionPart {
  protected selectedId?: number;
  protected readonly label: HTMLLabelElement;
  public get changed(): boolean {
    return this.selectedId != (this.answer?.values[0].value ?? null);
  }

  constructor(
    part: IQuestionPart,
    partLayout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, partLayout, owner, answer);
    this.label = this.element.querySelector("[data-bc-add-item]");
    this.selectedId = null;
  }

  protected async getValueAsync(id: number): Promise<IFixValue> {
    const rooUrl = this.part.link.split("?")[0];
    const url = `${rooUrl}?fixid=${id}`;
    return await Util.getDataAsync<IFixValue>(url);
  }

  protected setValue(value: IFixValue): boolean {
    const mustChange = this.selectedId !== value.id;
    if (mustChange) {
      this.element.querySelector("label").innerHTML = value.value;
      this.selectedId = value.id;
      if (this.owner.options.callback) {
        const param: IEditParams = {
          element: this.element,
          prpId: this.owner.question.prpId,
          typeId: this.owner.question.typeId,
          value: value,
        };
        this.owner.options.callback(param);
      }
    }
    return mustChange;
  }

  public getValidationErrors(): IValidationError {
    return null;
  }

  public getAdded(): IUserActionPart {
    let retVal = null;
    if (!this.answer) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.selectedId,
          },
        ],
      };
    }
    return retVal;
  }

  public getEdited(): IUserActionPart {
    let retVal = null;
    if (
      this.answer &&
      this.selectedId &&
      this.answer.values[0].value != this.selectedId
    ) {
      retVal = {
        part: this.part.part,
        values: [
          {
            id: this.answer.values[0].id,
            value: this.selectedId,
          },
        ],
      };
    }
    return retVal;
  }

  public getDeleted(): IUserActionPart {
    let retVal = null;
    if (this.answer && !this.selectedId) {
      retVal = this.answer;
    }
    return retVal;
  }
}
