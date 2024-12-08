/// <reference path="../../../../../@types/typings.d.ts" />
import { IPartCollection, IAnswerPart } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import Question from "../../question/Question";
import layout from "./assets/auto-fill-multi-type.html";
import "./assets/style";
import AutoFillType from "./AutoFillType";
import SearchPopup from "./SearchPopup";

export default class AutoFillMultiType extends AutoFillType {
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
    this.getQueryStringParamsAsync()
      .then((x) => {
        const popup = new SearchPopup(
          this.part.link,
          this.setValue.bind(this),
          true,
          x,
          this.owner.options.direction,
          this.owner.options.skin
        );
      })
      .catch((error) => {
        //Has empty required part!
      });
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
