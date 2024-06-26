import Snap from "snapsvg-cjs"
import {urlencode} from "nunjucks/src/filters";

export class SvgUtils {

    constructor(resolution = {width: 144, height: 144}) {
        this.buttonRes = resolution;
        this.halfRes = {
            width: this.buttonRes.width / 2,
            height: this.buttonRes.height / 2
        }
        this.fontSize = 24;
        this.lineAttr = {
            "fill": "#FFF",
            "font-family": "sans-serif",
            "font-weight": "bold",
            "font-size": `${this.fontSize}px`,
            "text-anchor": "middle",
            "stroke": "#000",
            "strokeWidth": 4,
        }
        this.snap = Snap(this.buttonRes.width, this.buttonRes.height);
    }

    generateIconSVG(iconSVG, iconColor) {
        const icon = this.snap.path(iconSVG)
        icon.attr("fill", iconColor);
        const iconBBox = icon.getBBox();
        const iconHeight = iconBBox.height;
        const iconWidth = iconBBox.width;
        const targetHeight = this.buttonRes.height / 1.3;
        const targetWidth = this.buttonRes.width / 1.3;
        const scaleFactor = Math.min(targetHeight / iconHeight, targetWidth / iconWidth);
        icon.transform(`scale(${scaleFactor})`)

        let outerSVG = this.snap.outerSVG();
        this.snap.clear();
        return outerSVG
    }

    generateButtonSVG(labels, iconSVG, iconColor, isAction = false, isMultiAction = false) {

        if (iconSVG) {
            const icon = this.snap.path(iconSVG)
            icon.attr("fill", iconColor);
            const iconBBox = icon.getBBox();
            const iconHeight = iconBBox.height;
            const iconWidth = iconBBox.width;
            const targetHeight = this.halfRes.height / 1.2;
            const targetWidth = this.buttonRes.width / 1.3;
            const scaleFactor = Math.min(targetHeight / iconHeight, targetWidth / iconWidth);
            const xPos = (this.buttonRes.width - iconWidth * scaleFactor) / 2 - (iconBBox.x * scaleFactor);
            const yPos = (this.halfRes.height - iconHeight * scaleFactor) / 2 - (iconBBox.y * scaleFactor);
            icon.transform(`translate(${xPos} ${yPos}) scale(${scaleFactor})`)
        }

        if (isAction) {
            const color = isMultiAction ? "#3e89ff" : "#62ff65"
            this.snap.circle(this.buttonRes.width - 1, 0, 15).attr("fill", color)
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
        // this.snap.line(this.halfRes, 0, this.halfRes, this.buttonRes).attr("stroke", "#FFFFFF")
        // this.snap.line(this.halfRes / 2, 0, this.halfRes / 2, this.buttonRes).attr("stroke", "#FFFFFF")
        // this.snap.line(this.halfRes * 1.5, 0, this.halfRes * 1.5, this.buttonRes).attr("stroke", "#FFFFFF")
        // this.snap.line(0, this.halfRes, this.buttonRes, this.halfRes).attr("stroke", "#FFFFFF")
        // this.snap.line(0, this.halfRes / 2, this.buttonRes, this.halfRes / 2).attr("stroke", "#FFFFFF")
        // this.snap.line(0, this.halfRes * 1.5, this.buttonRes, this.halfRes * 1.5).attr("stroke", "#FFFFFF")

        let outerSVG = this.snap.outerSVG();
        this.snap.clear();
        return outerSVG
    }

    drawText(text, lineNr) {
        const escapedText = urlencode(text);
        const quarterHeight = this.buttonRes.height / 4
        this.snap.text(0, (quarterHeight - ((quarterHeight * 1.2 - this.fontSize) / 2)) + lineNr * quarterHeight, escapedText)
            .attr(this.lineAttr)
            .transform(`translateX(${this.halfRes.width})`);
    }

}
