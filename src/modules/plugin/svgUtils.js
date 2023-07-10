import Snap from "snapsvg"
import {urlencode} from "nunjucks/src/filters";

export class SvgUtils {

    constructor() {
        this.buttonRes = 144;
        this.halfRes = this.buttonRes / 2;
        this.buttonBgColor = "#000000";
        this.lineAttr = {
            "fill": "#FFF",
            "font-family": "sans-serif",
            "font-weight": "bold",
            "font-size": "24px",
            "text-anchor": "middle",
            "stroke": "#000",
            "strokeWidth": 4,
        }
        this.snap = Snap(this.buttonRes, this.buttonRes);
    }

    generateButtonSVG(labels, iconSVG, iconColor, isAction = false, isMultiAction = false) {


        this.snap.rect(0, 0, this.buttonRes, this.buttonRes).attr({fill: this.buttonBgColor})

        if (iconSVG) {
            const icon = this.snap.path(iconSVG)
            icon.attr("fill", iconColor);
            const iconBBox = icon.getBBox();
            const iconHeight = iconBBox.height;
            const targetHeight = this.halfRes - 20;
            const scaleFactor = targetHeight / iconHeight;
            const xPos = this.halfRes - (iconBBox.width * scaleFactor / 2) - (iconBBox.x * scaleFactor);
            const yPos = 10 - iconBBox.y * scaleFactor;
            icon.transform(`translate(${xPos} ${yPos}) scale(${scaleFactor})`)
        }

        if (isAction) {
            const color = isMultiAction ? "#3e89ff" : "#62ff65"
            this.snap.circle(this.buttonRes - 1, 0, 15).attr("fill", color)
        }

        let currentLineNumber = 0;
        for (let i = 0; i < labels.length; i++) {
            let lines = labels[i].split("\n");
            for (let i = currentLineNumber; i < (lines.length + currentLineNumber); i++) {
                this.drawText(lines[i - currentLineNumber], i);
            }
            currentLineNumber += lines.length;
        }

        // Debug Grid
        // s.line(this.halfRes, 0, this.halfRes, this.buttonRes).attr("stroke", "#FFFFFF")
        // s.line(this.halfRes / 2, 0, this.halfRes / 2, this.buttonRes).attr("stroke", "#FFFFFF")
        // s.line(this.halfRes * 1.5, 0, this.halfRes * 1.5, this.buttonRes).attr("stroke", "#FFFFFF")
        // s.line(0, this.halfRes, this.buttonRes, this.halfRes).attr("stroke", "#FFFFFF")
        // s.line(0, this.halfRes / 2, this.buttonRes, this.halfRes / 2).attr("stroke", "#FFFFFF")
        // s.line(0, this.halfRes * 1.5, this.buttonRes, this.halfRes * 1.5).attr("stroke", "#FFFFFF")

        let outerSVG = this.snap.outerSVG();
        this.snap.clear();
        return outerSVG
    }

    drawText(text, lineNr) {
        const escapedText = urlencode(text);
        this.snap.text(0, 26 + lineNr * 36, escapedText)
            .attr(this.lineAttr)
            .transform(`translateX(${this.halfRes})`);
    }

}
