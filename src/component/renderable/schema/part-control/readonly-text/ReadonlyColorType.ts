import layout from "./assets/color-layout.html";
import Question from "../../question/Question";
import ReadonlyQuestionPart from "../../question-part/ReadonlyQuestionPart";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";
import { IEditParams } from "../../IFormMakerOptions";

export default class ReadonlyColorType extends ReadonlyQuestionPart {
  private readonly _label: HTMLInputElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._label = this.element.querySelector<any>("[data-bc-text-input]");
    this._label.value = answer?.values[0].value ?? null;
    if (this.owner.options.callback) {
      const param: IEditParams = {
        element: this.element,
        prpId: this.owner.question.prpId,
        typeId: this.owner.question.typeId,
        value: answer?.values[0],
      };
      this.owner.options.callback(param);
    }
  }
}
