import { IPartCollection, IPartValue } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";
import ReadonlyQuestionPart from "../../question-part/ReadonlyQuestionPart";
import Question from "../../question/Question";
import ExtensionList from "./ExtensionList";
import IFileInfo from "./IFileInfo";
import layout from "./assets/readonly-layout.html";
import imageLayout from "./assets/readonly-image-layout.html";
import "./assets/style";
import IDictionary from "../../../../../IDictionary";
import IBCUtil from "../../../../../wrapper/IBCUtil";

declare const $bc: IBCUtil;

export default class ReadOnlyUploadType extends ReadonlyQuestionPart {
  protected multiple: boolean = false;
  protected files: IDictionary<IFileInfo>;
  protected filesPath: string;

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this.files = {};
    this.filesPath = owner.options.filesPath ?? "";
    if (answer) {
      this.setValue(answer.values);
    }
  }

  addFileToUI(file: IFileInfo) {
    const container = this.element.querySelector<any>(
      "[data-bc-upload-file-list]"
    );
    let fileUrl = `${this.filesPath}${file.url}`;
    const template = imageLayout
      .replace("@name", file.name)
      .replace("@downloadName", file.name)
      .replace("@url", fileUrl);
    const fileElement = $bc.util.toNode(template).childNodes[0] as Element;
    const imageElement = fileElement.querySelector<HTMLImageElement>(
      "[data-bc-item-icon]"
    );
    const localId = $bc.util.getRandomName("uploader_");
    if (!this.part.multiple) {
      this.files = {};
      container.innerHTML = "";
    }
    this.files[localId] = file;
    if (file.image && file.image != "") {
      (imageElement as any).src = `/${file.image}`;
    } else {
      (imageElement as any).src =
        ExtensionList[file.type] ?? ExtensionList["???"];
    }

    container.append(fileElement);
  }

  setValue(values: IPartValue[]) {
    if (values) {
      values
        .map((x) => {
          const retVal: IFileInfo = {
            id: x.id,
            name: x.value.name,
            type: x.value.type,
            size: 0,
            url: x.value.url ?? null,
            image: x.value.image ?? null,
            data: null,
            mustDelete: false,
          };
          return retVal;
        })
        .forEach((image) => this.addFileToUI(image));
    }
  }

}