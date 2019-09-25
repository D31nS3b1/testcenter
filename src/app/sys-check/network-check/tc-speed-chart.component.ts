import { Component, ElementRef, OnInit } from '@angular/core';

export interface TcSpeedChartSettings {
  lineWidth: number;
  css: string;
  height: number;
  width: number;
  gridColor: string;
  axisColor: string;
  labelFont: string;
  labelPadding: number;
  xAxisMaxValue: number;
  xAxisMinValue: number;
  yAxisMaxValue: number;
  yAxisMinValue: number;
  xAxisStepSize: number;
  yAxisStepSize: number;
  xAxisLabels: (x: number, col: number) => string;
  yAxisLabels: (y: number, col: number) => string;
  xProject(x: number): number;
  yProject(y: number): number;
}

@Component({
  selector: 'tc-speed-chart',
  template: '<canvas></canvas>'
})
export class TcSpeedChartComponent implements OnInit {

  private canvas;
  private context;
  private el;
  private xScale;
  private yScale;

  private config: TcSpeedChartSettings = {
    css: 'border: 1px solid black',
    lineWidth: 5,
    width: 800,
    height: 240,
    gridColor: 'silver',
    axisColor: 'red',
    labelFont: '20 pt Verdana',
    labelPadding: 4,
    xAxisMaxValue: 200,
    xAxisMinValue: -10,
    yAxisMaxValue: 100,
    yAxisMinValue: -10,
    xAxisStepSize: 20,
    yAxisStepSize: 10,
    xAxisLabels: (x) => '' + Math.round(x),
    yAxisLabels: (y) => '' + Math.round(y),
    xProject: (x) => x,
    yProject: (y) => y
  };

  constructor(elem: ElementRef) {
    this.el = elem.nativeElement;
  }

  ngOnInit() {

    this.canvas = this.el.querySelector('canvas');
    this.context = this.canvas.getContext('2d');

    this.reset(this.config);
  }

  public reset(config: TcSpeedChartSettings) {

    this.config = {...this.config, ...config};

    this.canvas.setAttribute('style', this.config.css);
    this.canvas.setAttribute('height', this.config.height);
    this.canvas.setAttribute('width', this.config.width);

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.font = this.config.labelFont;

    const xAxisMinValue = this.config.xProject(this.config.xAxisMinValue);
    const xAxisMaxValue = this.config.xProject(this.config.xAxisMaxValue);
    const yAxisMinValue = this.config.yProject(this.config.yAxisMinValue);
    const yAxisMaxValue = this.config.yProject(this.config.yAxisMaxValue);

    this.xScale = this.canvas.width / (xAxisMaxValue - xAxisMinValue);
    this.yScale = this.canvas.height / (yAxisMaxValue - yAxisMinValue);

    this.drawGridColumns();
    this.drawGridRows();

    this.context.lineWidth = this.config.lineWidth;
  }

  public plotData(dataPoints: Array<[number, number]>, color: string = null) {

    if (!dataPoints.length) {
      return;
    }

    color = color || this.randomColor();
    const oldColor = this.context.strokeStyle;
    this.context.strokeStyle = color;
    this.context.beginPath();

    const realPoints = dataPoints
      .map(xy => [ // apply projection
        this.config.xProject(xy[0]),
        this.config.yProject(xy[1])
      ])
      .map(xy => [ // apply viewport
        xy[0] - this.config.xProject(this.config.xAxisMinValue),
        xy[1] - this.config.yProject(this.config.yAxisMinValue)
      ])
      .map(xy => [ // scale to image size
        xy[0] * this.xScale,
        this.canvas.height - xy[1] * this.yScale
      ]);

    // console.log(dataPoints, realPoints);

    this.context.moveTo(realPoints[0][0], realPoints[0][1]);
    realPoints.forEach(xy => {
      this.context.lineTo(xy[0], xy[1]);
    });

    this.context.stroke();
    this.context.strokeStyle = oldColor;
  }

  private drawGridColumns() {

    const firstCol = Math.floor(this.config.xAxisMinValue / this.config.xAxisStepSize) * this.config.xAxisStepSize;
    for (
        let x = firstCol, count = 1;
        x < this.config.xAxisMaxValue;
        x = firstCol + count++ * this.config.xAxisStepSize
    ) {
      const transformedX = this.config.xProject(x);
      const scaledX = this.xScale * (transformedX - this.config.xProject(this.config.xAxisMinValue));
      const label = this.config.xAxisLabels(x, count);
      if (label === '') {
        continue;
      }
      this.context.fillText(label, scaledX, this.canvas.height - this.config.labelPadding);
      this.context.strokeStyle = (x === 0) ? this.config.axisColor : this.config.gridColor;
      this.context.beginPath();
      this.context.moveTo(scaledX, 0);
      this.context.lineTo(scaledX, this.canvas.height);
      this.context.stroke();
    }
  }

  private drawGridRows() {

    const firstRow = Math.floor(this.config.yAxisMinValue / this.config.yAxisStepSize) * this.config.yAxisStepSize;
    for (
        let y = firstRow, count = 1;
        y < this.config.yAxisMaxValue;
        y = firstRow + count++ * this.config.yAxisStepSize
    ) {
      const transformedY = this.config.yProject(y);
      const scaledY = this.canvas.height - this.yScale * (transformedY - this.config.yProject(this.config.yAxisMinValue));
      this.context.fillText(this.config.yAxisLabels(y, count), this.config.labelPadding, scaledY);
      this.context.strokeStyle = (y === 0) ? this.config.axisColor : this.config.gridColor;
      this.context.beginPath();
      this.context.moveTo(0, scaledY);
      this.context.lineTo(this.canvas.width, scaledY);
      this.context.stroke();
    }
  }

  private randomColor() {

    return 'rgb(' + new Array(3).fill(0).map(() => Math.round(256 * Math.random())).join(', ') + ')';
  }

}
