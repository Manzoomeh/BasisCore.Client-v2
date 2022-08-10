/// <reference path="../../../../../@types/typings.d.ts" />
import { IPartCollection, IAnswerPart } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import Question from "../../question/Question";
import layout from "./assets/auto-complete-multi-type.html";
import "./assets/style";
import AutoCompleteType from "./AutoCompleteType";
import SearchPopup from "./SearchPopup";

export default class AutoCompleteMultiType extends AutoCompleteType {
  constructor(
    part: IQuestionPart,
    owner: Question,
    answer: IPartCollection,
    localAnswer: IPartCollection
  ) {
    super(part, layout, owner, answer);
    owner.replaceAddClick(this.onShowPopUpBtnClick.bind(this));
    const value = (answer ?? localAnswer)?.values[0];
    if (value) {
      this.getValueAsync(value.value).then((fixValue) =>
        this.setValue(fixValue)
      );
    }
  }

  private onShowPopUpBtnClick() {
    const popup = new SearchPopup(
      this.part.link,
      this.setValue.bind(this),
      true,
      this.owner.options.queryStrings
    );
  }

  protected setValue(value: IFixValue): boolean {
    if (!this.selectedId) {
      super.setValue(value);
    } else {
      var p: IAnswerPart = {
        parts: [
          {
            part: this.part.part,
            values: [
              {
                value: value.id,
              },
            ],
          },
        ],
      };
      this.owner.owner.addQuestion(p);
    }
    return true;
  }
}
