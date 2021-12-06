import Question from "../question/Question";
import AutoCompleteMultiType from "./auto-complete/AutoCompleteMultiType";
import AutoCompleteSingleType from "./auto-complete/AutocompleteSingleType";
import CheckListType from "./check-list/CheckListType";
import SelectType from "./select/SelectType";
import TextAriaType from "./text-area/TextAriaType";
import TextType from "./text/TextType";
import UnknownType from "./unknown/UnknownType";
import QuestionPart from "../question-part/QuestionPart";
import ReadonlyCheckListType from "./check-list/ReadonlyCheckListType";
import ReadOnlyText from "./readonly-text/ReadOnlyText";
import ReadOnlyTextAriaType from "./readonly-text-area/ReadOnlyTextAriaType";
import ReadOnlySelectType from "./select/ReadOnlySelectType";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestion, IQuestionPart } from "../IQuestionSchema";

export default class QuestionPartFactory {
  public static generate(
    question: IQuestion,
    part: IQuestionPart,
    owner: Question,
    answer?: IPartCollection
  ): QuestionPart {
    var retVal: QuestionPart = null;
    if (!owner.options.viewMode) {
      switch (part.viewType.toLowerCase()) {
        case "text": {
          retVal = new TextType(part, owner, answer);
          break;
        }
        case "select": {
          retVal = new SelectType(part, owner, answer);
          break;
        }
        case "checklist": {
          retVal = new CheckListType(part, owner, answer);
          break;
        }
        case "textarea": {
          retVal = new TextAriaType(part, owner, answer);
          break;
        }
        case "autocomplete": {
          retVal = question.multi
            ? new AutoCompleteMultiType(
                part,
                owner,
                answer?.values[0].id ? answer : null,
                answer
              )
            : new AutoCompleteSingleType(part, owner, answer);
          break;
        }
        default: {
          retVal = new UnknownType(part, owner, answer);
          break;
        }
      }
    } else {
      switch (part.viewType.toLowerCase()) {
        case "checklist": {
          retVal = new ReadonlyCheckListType(part, owner, answer);
          break;
        }
        case "textarea": {
          retVal = new ReadOnlyTextAriaType(part, owner, answer);
          break;
        }
        case "select": {
          retVal = new ReadOnlySelectType(part, owner, answer);
          break;
        }
        case "autocomplete": {
          retVal = question.multi
            ? new AutoCompleteMultiType(
                part,
                owner,
                answer?.values[0].id ? answer : null,
                answer
              )
            : new AutoCompleteSingleType(part, owner, answer);
          break;
        }
        default: {
          retVal = new ReadOnlyText(part, owner, answer);
          break;
        }
      }
    }
    return retVal;
  }
}
