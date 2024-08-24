/// <reference path="../../../../../@types/typings.d.ts" />
import IDictionary from "../../../../../IDictionary";
import Util from "../../../../../Util";
import { IPartCollection, IAnswerPart } from "../../IAnswerSchema";
import { IEditParams } from "../../IFormMakerOptions";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import IValidationError from "../../IValidationError";
import QuestionPart from "../../question-part/QuestionPart";
import Question from "../../question/Question";
import layout from "./assets/auto-fill-simple-type.html";
import "./assets/style";
import AutoFillType from "./AutoFillType";
import SearchPopup from "./SearchPopup";
import ValidationHandler from "../../../../ValidationHandler";
export default class AutoFillSimpleType extends AutoFillType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    const ul = this.element.querySelector<HTMLElement>(
      "[data-sys-search-result]"
    );
    const input = this.element.querySelector("[data-bc-search]");
    input.addEventListener("keyup", (e) => {
      this.onKeyUpAsync(<KeyboardEvent>e);
    });
    input.addEventListener("focus", (e) => {
      ul.style.display = "block";
      window.addEventListener("click", clickListener);
    });
    const clickListener = (e) => {
      if (!(ul.contains(e.target) || ul == e.target || e.target == input)) {
        ul.style.display = "none";

        window.removeEventListener("click", clickListener);
      }
    };
    const value = answer?.values[0];
    if (value) {
      this.getValueAsync(value.value).then((fixValue) =>
        this.setValue(fixValue)
      );
    }
  }
  protected async getQueryStringParamsAsync(): Promise<IDictionary<string>> {
    let retVal = await this.owner.options.getQueryStringParamsAsync();
    let hasError = false;
    if (this.part.dependency) {
      retVal = retVal || {};
      const tasks = this.owner.owner.AllQuestions.map((x) =>
        x.getAllValuesAsync()
      );
      const thisQuestionsAnswer = await this.owner.getAllValuesAsync();

      const taskResult = await Promise.all(tasks);
      const allValues = taskResult.map((x) => {
        return {
          propId: x.propId,
          parts: x.values.filter((y) => y).flatMap((y) => y.parts),
        };
      });
      this.part.dependency.forEach(async (item) => { 
        let relatedParts: QuestionPart[] = null;

        if (item.prpId == this.owner.question.prpId) {
          if (item.required) {
            relatedParts = this.owner.owner.AllQuestions.filter(
              (x) => x.QuestionSchema.prpId == item.prpId
            )[0].getParts(item.part);
          }
          const valuesPart = thisQuestionsAnswer?.parts.find(
            (part) => part.part == item.part
          ).values;
          let value = "";
          if (valuesPart?.length > 0) {
            value =
              valuesPart.length > 1
                ? valuesPart.map((x) => x.value)
                : valuesPart[0].value;
            relatedParts?.forEach((x) => x.updateUIAboutError(null));
            retVal[item.name] = value;
          } else if (item.required) {
            const requiredError: IValidationError =
              await ValidationHandler.getError(item.part, "required");
            relatedParts.forEach((x) => x.updateUIAboutError(requiredError));
            hasError = true;
            retVal[item.name] = value;
          }
        } else {
          const relatedProperties = allValues.find(
            (x) => x.propId == item.prpId
          );
          if (relatedProperties) {
            const valuesPart = relatedProperties.parts
              .filter((x) => x.part == item.part)
              .flatMap((x) => x.values);
            if (item.required) {
              relatedParts = this.owner.owner.AllQuestions.filter(
                (x) => x.QuestionSchema.prpId == item.prpId
              )[0].getParts(item.part);
            }

            let value = "";
            if (valuesPart.length > 0) {
              value = JSON.stringify(
                valuesPart.length > 1
                  ? valuesPart.map((x) => x.value)
                  : valuesPart[0].value
              );
              relatedParts?.forEach((x) => x.updateUIAboutError(null));
            } else if (item.required) {
              const requiredError: IValidationError =
                await ValidationHandler.getError(item.part, "required");
              relatedParts.forEach((x) => x.updateUIAboutError(requiredError));
              hasError = true;
            }
            retVal[item.name] = value;
          }
        }
      });
    }

    return retVal;
  }
  private async onKeyUpAsync(e: KeyboardEvent) {
    e.preventDefault();
    const term = (e.target as HTMLFormElement).value;
    const queryStrings = await this.getQueryStringParamsAsync();
    const url = Util.formatString(this.part.link, { term, ...queryStrings });
    const result = await Util.getDataAsync<Array<IFixValue>>(url);
    const ul = this.element.querySelector<HTMLUListElement>("[data-bc-result]");
    ul.innerHTML = "";
    if (result.length > 0) {
      result.forEach((item) => {
        const li = document.createElement("li");
        li.setAttribute("data-bc-value", item.value);
        li.setAttribute("data-sys-hover", "");
        li.setAttribute("data-sys-text", "");
        li.innerHTML = item.value;
        li.addEventListener("click", (e) => {
          e.preventDefault();
          if (this.setValue(item)) {
            li.remove();
          }
        });
        ul.appendChild(li);
      });
    }
  }

  protected setValue(value: IFixValue): boolean {
    const mustChange = this.selectedId !== value.id;
    if (mustChange) {
      this.element.querySelector<HTMLInputElement>("[data-bc-search]").value =
        value.value;
      this.selectedId = value.id;
      if (this.owner.options.callback) {
        const param: IEditParams = {
          element: this.element,
          prpId: this.owner.question.prpId,
          typeId: this.owner.question.typeId,
          value: value,
        };
        this.owner.options.callback(param);
      }
    }

    return true;
  }
}
