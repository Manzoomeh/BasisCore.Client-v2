import layout from "./assets/layout.html";
import itemLayout from "./assets/readonly-item-layout.html";
import Question from "../../question/Question";
import Util from "../../../../../Util";
import { IQuestionPart, IPartCollection, IFixValue } from "../../ISchema";
import { IEditParams } from "../../IFormMakerOptions";
import ReadOnlyListBaseType from "../ReadOnlyListBaseType";

export default class ReadonlyCheckListType extends ReadOnlyListBaseType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected fillUI(values: Array<IFixValue>) {
    values.forEach((item) => {
      if (this.answer?.values.find((x) => x.value == item.id)) {
        const newTemplate = itemLayout.replace("@title", item.value);
        const template = Util.parse(newTemplate).querySelector("div");
        this.element.querySelector("div").appendChild(template);
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
    });
  }
}
