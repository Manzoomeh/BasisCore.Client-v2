import Question from "../../question/Question";
import Util from "../../../../../Util";
import { IEditParams } from "../../IFormMakerOptions";
import ReadOnlyListBaseType from "../ReadOnlyListBaseType";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";

export default abstract class ReadonlySelectListType extends ReadOnlyListBaseType {
  protected abstract get itemLayout():string;

  constructor(part: IQuestionPart, layout: string, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected fillUI(values: Array<IFixValue>) {
    values.forEach((item) => {
      if (this.answer?.values.find((x) => x.value == item.id)) {
        const newTemplate = this.itemLayout.replace("@title", item.value);
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
