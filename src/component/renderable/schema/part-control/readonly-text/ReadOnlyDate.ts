import { IPartCollection } from "../../IAnswerSchema";
import { IEditParams } from "../../IFormMakerOptions";
import { IQuestionPart } from "../../IQuestionSchema";
import ReadonlyQuestionPart from "../../question-part/ReadonlyQuestionPart";
import Question from "../../question/Question";
import layout from "./assets/text-layout.html";

export default class ReadOnlyDate extends ReadonlyQuestionPart {
  private readonly _label: HTMLLabelElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._label = this.element.querySelector<any>("[data-bc-text-input]");
    this._label.innerHTML = answer?.values[0].value["sstring"] ?? answer?.values[0].value?? null;
    this.answer.values[0].value = answer?.values[0].value["sstring"]
    if (this.owner.options.callback) {
      const param: IEditParams = {
        element: this.element,
        prpId: this.owner.question.prpId,
        typeId: this.owner.question.typeId,
        value: answer?.values[0].value["sstring"] ?? answer?.values[0].value,
      };
      this.owner.options.callback(param);
    }
  }
}
