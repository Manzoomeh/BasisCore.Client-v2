import Question from "../../question/Question";
import layout from "./assets/layout.html";
import { IQuestionPart, IPartCollection } from "../../ISchema";
import { IEditParams } from "../../IFormMakerOptions";
import ReadonlyQuestionPart from "../../question-part/ReadonlyQuestionPart";

export default class ReadOnlyTextAriaType extends ReadonlyQuestionPart {
  private readonly _label: HTMLLabelElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._label = this.element.querySelector<any>("[data-bc-text-input]");
    this._label.innerHTML = answer?.values[0].value;
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
