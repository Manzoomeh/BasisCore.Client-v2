import Question from "../../question/Question";
import layout from "./assets/readonly-layout.html";
import ListBaseType from "../ListBaseType";
import { IQuestionPart, IPartCollection, IFixValue } from "../../ISchema";
import { IUserActionPart } from "../../IUserActionResult";
import { IEditParams } from "../../IFormMakerOptions";

export default class ReadOnlySelectType extends ListBaseType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected fillUI(values: Array<IFixValue>) {
    const value = this.answer?.values[0];
    const item = values.find((x) => x.id == value.value);
    this.element.querySelector("label").innerHTML = item?.value;
    if (this.owner.options.callback) {
      const param: IEditParams = {
        element: this.element,
        prpId: this.owner.question.prpId,
        typeId: this.owner.question.typeId,
        value: item,
      };
      this.owner.options.callback(param);
    }
  }

  public getAddedParts(): IUserActionPart {
    throw new Error("Method not implemented.");
  }
  public getEditedParts(): IUserActionPart {
    throw new Error("Method not implemented.");
  }
  public getDeletedParts(): IUserActionPart {
    throw new Error("Method not implemented.");
  }
}
