import Util from "../../../../Util";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../IQuestionSchema";
import EditableQuestionPart from "../question-part/EditableQuestionPart";
import Question from "../question/Question";

export default abstract class ListBaseType extends EditableQuestionPart {
  constructor(
    part: IQuestionPart,
    layout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, layout, owner, answer);
    if (this.part.fixValues) {
      this.fillUI(this.part.fixValues);
    } else {
      this.loadFromServerAsync();
    }
  }

  protected abstract fillUI(values: Array<IFixValue>);
  protected async loadFromServerAsync(): Promise<void> {
    const data = {
      prpId: this.owner.question.prpId,
      part: this.part.part,
    };
    const url = Util.formatString(this.part.link, data);
    const result = await Util.getDataAsync<Array<IFixValue>>(url);
    this.fillUI(result);
  }
}
