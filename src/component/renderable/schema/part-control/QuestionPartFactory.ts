import Question from "../question/Question";
import AutoCompleteMultiType from "./auto-fill/auto-complete/AutoCompleteMultiType";
import AutoCompleteSingleType from "./auto-fill/auto-complete/AutoCompleteSingleType";
import ReferenceMultiType from "./auto-fill/reference/ReferenceMultiType";
import ReferenceSingleType from "./auto-fill/reference/ReferenceSingleType";
import CheckListType from "./select-list/check-list/CheckListType";
import RadioListTypeDefault from "./select-list/radio/RadioListTypeDefault";
import RadioListTypeTemplate2 from "./select-list/radio/RadioListTypeTemplate2";
import SelectType from "./select/SelectType";
import TextAriaType from "./text-area/TextAriaType";
import TextType from "./text/TextType";
import UploadType from "./upload/UploadType";
import BlobType from "./upload/BlobType";
import UnknownType from "./unknown/UnknownType";
import QuestionPart from "../question-part/QuestionPart";
import ReadonlyCheckListType from "./select-list/check-list/ReadonlyCheckListType";
import ReadonlyRadioType from "./select-list/radio/ReadonlyRadioType";
import ReadOnlyText from "./readonly-text/ReadOnlyText";
import ReadOnlyTextAriaType from "./readonly-text-area/ReadOnlyTextAriaType";
import ReadOnlySelectType from "./select/ReadOnlySelectType";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestion, IQuestionPart } from "../IQuestionSchema";
import Lookup from "./lookup/Lookup";
import TimeType from "./text/TimeType";
import ColorType from "./text/ColorType";
import PasswordType from "./text/PasswordType";
import ReadonlyUploadType from "./upload/ReadOnlyUploadType";
import ReadonlyColorType from "./readonly-text/ReadonlyColorType";
import ComponentContainer from "./component-container/ComponentContainer";
import HTMLFieldType from "./html/HTMLFieldType";
import AutoCompleteSimpleType from "./auto-fill/auto-complete/AutoCompleteSimpleType";
import ReferenceSimpleType from "./auto-fill/reference/ReferenceSimpleType";
import { Skin } from "../IFormMakerOptions";
import ReadOnlyTime from "./readonly-text/ReadOnlyTime";
import ReadOnlyDate from "./readonly-text/ReadOnlyDate";

export default class QuestionPartFactory {
  public static generate(
    question: IQuestion,
    part: IQuestionPart,
    owner: Question,
    skin: Skin,
    answer?: IPartCollection
  ): QuestionPart {
    var retVal: QuestionPart = null;
    var viewType = part.viewType.toLowerCase();
    if (owner.options.displayMode != "view") {
      switch (viewType) {
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
        case "radio": {
          if (skin == "template2") {
            retVal = new RadioListTypeTemplate2(part, owner, answer);
          } else {
            retVal = new RadioListTypeDefault(part, owner, answer);
          }
          break;
        }
        case "html": {
          retVal = new HTMLFieldType(part, owner, answer);
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
        case "simpleautocomplete": {
          retVal = new AutoCompleteSimpleType(part, owner, answer);
          break;
        }
        case "simplereference": {
          retVal =  new ReferenceSimpleType(part, owner, answer)
          break;
        }
        case "reference": {
          retVal = question.multi
            ? new ReferenceMultiType(
              part,
              owner,
              answer?.values[0].id ? answer : null,
              answer
            )
            : new ReferenceSingleType(part, owner, answer);
          break;
        }
        case "lookup": {
          retVal = new Lookup(part, owner, answer);
          break;
        }
        case "time": {
          retVal = new TimeType(part, owner, answer);
          break;
        }
        case "color": {
          retVal = new ColorType(part, owner, answer);
          break;
        }
        case "password": {
          retVal = new PasswordType(part, owner, answer);
          break;
        }
        case "upload": {
          retVal = new UploadType(part, owner, answer);
          break;
        }
        case "blob": {
          retVal = new BlobType(part, owner, answer);
          break;
        }
        default: {
          retVal = viewType.startsWith("component.")
            ? new ComponentContainer(part, owner, answer)
            : new UnknownType(part, owner, answer);
          break;
        }
      }
    } else {
      switch (viewType) {
        case "checklist": {
          retVal = new ReadonlyCheckListType(part, owner, answer);
          break;
        }
        case "radio": {
          retVal = new ReadonlyRadioType(part, owner, answer);
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
        case "simpleautocomplete": {
          retVal = new AutoCompleteSimpleType(part, owner, answer);
          break;
        }
        case "simplereference": {
          retVal =  new ReferenceSimpleType(part, owner, answer)
          break;
        }
        case "reference": {
          retVal = question.multi
            ? new ReferenceMultiType(
              part,
              owner,
              answer?.values[0].id ? answer : null,
              answer
            )
            : new ReferenceSingleType(part, owner, answer);
          break;
        }
        case "lookup": {
          retVal = new Lookup(part, owner, answer);
          break;
        }
        case "time": {
          retVal = new TimeType(part, owner, answer);
          break;
        }
        case "color": {
          retVal = new ReadonlyColorType(part, owner, answer);
          break;
        }
        case "password": {
          retVal = new PasswordType(part, owner, answer);
          break;
        }
        case "upload":
        case "blob": {
          retVal = new ReadonlyUploadType(part, owner, answer);
          break;
        }
        case "component.bc.timepicker" : {
          retVal =  new ReadOnlyTime(part, owner, answer)
          break;
        }
        case "component.calendar.datepicker" : {
          retVal =  new ReadOnlyDate(part, owner, answer)
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
