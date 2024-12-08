import { ISection } from "../IQuestionSchema";
import "./assets/style";
import layout from "./assets/layout_template2.html";
import { Skin } from "../IFormMakerOptions";
import Section from "./Section";

export default class SectionTemplate2 extends Section {
  constructor(sectionSchema: ISection, container: Element, skin: Skin, cell: number) {
    super(sectionSchema, container, layout, skin, cell)
  }
}