import Question from "../../question/Question";
import layout from "./assets/readonly-layout.html";
import { IEditParams } from "../../IFormMakerOptions";
import ReadOnlyListBaseType from "../ReadOnlyListBaseType";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";

export default class ReadOnlySelectType extends ReadOnlyListBaseType {
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
}
