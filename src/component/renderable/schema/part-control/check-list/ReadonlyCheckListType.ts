import layout from "./assets/layout.html";
import itemLayout from "./assets/readonly-item-layout.html";
import ListBaseType from "../ListBaseType";
import Question from "../../question/Question";
import Util from "../../../../../Util";
import { IQuestionPart, IPartCollection, IFixValue } from "../../ISchema";
import { IUserActionPart } from "../../IUserActionResult";

export default class ReadonlyCheckListType extends ListBaseType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected fillUI(values: Array<IFixValue>) {
    values.forEach((item) => {
      if (this.answer?.values.find((x) => x.value == item.id)) {
        const newTemplate = itemLayout.replace("@title", item.value);
        const template = Util.parse(newTemplate).querySelector("div");
        this.element.querySelector("div").appendChild(template);
      }
    });
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
