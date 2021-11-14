import Question from "../../question/Question";
import layout from "./assets/readonly-layout.html";
import ListBaseType from "../ListBaseType";
import { IQuestionPart, IPartCollection, IFixValue } from "../../ISchema";
import { IUserActionPart } from "../../IUserActionResult";

export default class ReadOnlySelectType extends ListBaseType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected fillUI(values: Array<IFixValue>) {
    const value = this.answer?.values[0];
    const item = values.find((x) => x.id == value.value);
    this.element.querySelector("label").innerHTML = item?.value;
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
