import "./assets/style";
import Question from "../../question/Question";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import Util from "../../../../../Util";
import { IPartCollection } from "../../IAnswerSchema";
import { IEditParams } from "../../IFormMakerOptions";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import IDictionary from "../../../../../IDictionary";
import QuestionPart from "../../question-part/QuestionPart";

export default abstract class AutoCompleteType extends EditableQuestionPart {
  protected selectedId?: number;
  protected readonly label: HTMLLabelElement;
  public get changed(): boolean {
    return this.selectedId != (this.answer?.values[0].value ?? null);
  }

  constructor(
    part: IQuestionPart,
    partLayout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, partLayout, owner, answer);
    this.label = this.element.querySelector("[data-bc-add-item]");
    this.selectedId = null;
  }

  protected async getValueAsync(id: number): Promise<IFixValue> {
    const rootUrl = this.part.link.split("?")[0];
    const url = Util.formatString(
      `${rootUrl}?fixid=${id}`,
      this.owner.options.queryStrings
    );
    return await Util.getDataAsync<IFixValue>(url);
  }

  protected setValue(value: IFixValue): boolean {
    const mustChange = this.selectedId !== value.id;
    if (mustChange) {
      this.element.querySelector("label").innerHTML = value.value;
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
    return mustChange;
  }

  protected async getQueryStringsAsync(): Promise<IDictionary<string>> {
    let retVal = this.owner.options.queryStrings;
    let hasError = false;
    if (this.part.dependency) {
      retVal = retVal || {};
      const tasks = this.owner.owner.AllQuestions.map((x) =>
        x.getAllValuesAsync()
      );
      const taskResult = await Promise.all(tasks);
      const allValues = taskResult.map((x) => {
        return {
          propId: x.propId,
          parts: x.values.filter((y) => y).flatMap((y) => y.parts),
        };
      });
      this.part.dependency.forEach((item) => {
        const relatedProperties = allValues.find((x) => x.propId == item.prpId);
        let relatedParts: QuestionPart[] = null;
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
            const requiredError: IValidationError = {
              part: item.part,
              title: "required",
              errors: [
                {
                  type: "required",
                },
              ],
            };
            relatedParts.forEach((x) => x.updateUIAboutError(requiredError));
            hasError = true;
          }
          retVal[item.name] = value;
        }
      });
    }
    if (hasError) {
      throw Error("Has empty required part!");
    }
    return retVal;
  }

  public getValidationErrorsAsync(): Promise<IValidationError> {
    return Promise.resolve(this.ValidateValue(this.selectedId));
  }

  public getAddedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (!this.answer && this.selectedId) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.selectedId,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }

  public getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (
      this.answer &&
      this.selectedId &&
      this.answer.values[0].value != this.selectedId
    ) {
      retVal = {
        part: this.part.part,
        values: [
          {
            id: this.answer.values[0].id,
            value: this.selectedId,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }

  public getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer && !this.selectedId) {
      retVal = this.answer;
    }
    return Promise.resolve(retVal);
  }

  public getValuesAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.selectedId) {
      retVal = {
        part: this.part.part,
        values: [
          {
            value: this.selectedId,
          },
        ],
      };
    }
    return Promise.resolve(retVal);
  }
}
