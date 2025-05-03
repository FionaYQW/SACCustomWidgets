var getScriptPromisify = (src) => {
  return new Promise((resolve) => {
    $.getScript(src, resolve);
  });
};

var load_libs_flag = false;

(function () {
  const prepared = document.createElement("template");
  prepared.innerHTML = `
          <style type="text/css"></style>
          <script src= "https://code.jquery.com/jquery-3.7.1.min.js"></script>
          <div id="root"><button type="button" id="myBtn">Download PDF</button></div>
        `;

  class CustomExport extends HTMLElement {
    constructor() {
        // console.clear()
        super();
        this._shadowRoot = this.attachShadow({ mode: "open" });
        this._shadowRoot.appendChild(prepared.content.cloneNode(true));
        this._root = this._shadowRoot.getElementById("root");
        this._props = {};

        if (!load_libs_flag) {
            this.loadLibraries();
            load_libs_flag = true;
        }
      
        this.init();
    }

    async loadLibraries() {
        await getScriptPromisify("https://www.amcharts.com/lib/4/core.js");
        await getScriptPromisify("https://www.amcharts.com/lib/4/charts.js");
    }

    // getBase64ImageFromURL(url) {
    //     return new Promise((resolve, reject) => {
    //       var img = new Image();
    //       img.setAttribute("crossOrigin", "anonymous");
      
    //       img.onload = () => {
    //         var canvas = document.createElement("canvas");
    //         canvas.width = img.width;
    //         canvas.height = img.height;
      
    //         var ctx = canvas.getContext("2d");
    //         ctx.drawImage(img, 0, 0);
      
    //         var dataURL = canvas.toDataURL("image/png");
      
    //         resolve(dataURL);
    //       };
      
    //       img.onerror = error => {
    //         reject(error);
    //       };
      
    //       img.src = url;
    //     });
    // }

    init() {            
            console.log('init fired');        
    }

    onCustomWidgetBeforeUpdate(changedProperties) { 
        this._props = { ...this._props, ...changedProperties }
    }

    onCustomWidgetAfterUpdate(changedProperties) {

        if('myDataBinding' in changedProperties) {
            this.myDataBinding = changedProperties['myDataBinding']
        }

    }

    resultset(columns_per_page) {

        this.table_resultset = []
        this.table_headers = [];

        this.col_dimension = this.myDataBinding.metadata.dimensions
        this.col_dimension_len = Object.keys(this.col_dimension).length;

        this.col_measure = this.myDataBinding.metadata.mainStructureMembers
        this.col_measure_len = Object.keys(this.col_measure).length;

        // Table Headers ===============================
        var dim_header = [];
        for(var j = 0; j < this.col_dimension_len; j++) {
            dim_header.push({ text: this.col_dimension["dimensions_"+j.toString()]["description"], bold: true })
        }

        var mes_header = [...dim_header.slice(0, columns_per_page + dim_header.length)];

        for(var j = 0, cnt = 0; j <= this.col_measure_len; j++) {
            if(cnt >= columns_per_page) {
                this.table_headers.push([...mes_header.slice()])
                mes_header = [...dim_header.slice(0, mes_header.length)];
                cnt = 0;
            }

            if(cnt != 0 && j >= this.col_measure_len) {
                this.table_headers.push([...mes_header.slice()])
            }

            cnt++;

            if(this.col_measure["measures_"+j.toString()]) {
                mes_header.push({ text: this.col_measure["measures_"+j.toString()]["label"], bold: true })
                // dim_header.push({ text: "", bold: true })
            }
           
        }

        // console.log(this.table_headers, "---------")
        // =============================================

        // Table Data ==================================

        var res_arr = []
        var dim_indices = new Set();

        for(var i = 0; i < this.myDataBinding.data.length; i++) {

            var temp_arr = [];

            dim_indices.add(temp_arr.length);

            for(var j = 0; j < this.col_dimension_len; j++) {
                temp_arr.push(this.myDataBinding.data[i]["dimensions_"+j.toString()]["label"]);
            }

            for(var j = 0, cnt = 0; j < this.col_measure_len; j++) {

                if(cnt == columns_per_page) {

                    dim_indices.add(temp_arr.length);

                    for(var k = 0; k < this.col_dimension_len; k++) {
                        temp_arr.push(this.myDataBinding.data[i]["dimensions_"+k.toString()]["label"]);
                    }

                    cnt = 0;

                } 
                    
                temp_arr.push(this.myDataBinding.data[i]["measures_"+j.toString()]["formatted"]);

                cnt++;
            }
            
            res_arr.push(temp_arr);

        }
        this.table_resultset = res_arr;
        dim_indices = Array.from(dim_indices)
        dim_indices.shift()
        this.dim_indices = dim_indices;

        // ===============================================

        // console.log("Table Resultset : \n", this.table_resultset)
    }

    exportToPDF(columns_per_page, rows_per_page) {

        if (!this.myDataBinding || this.myDataBinding.state !== 'success') {
            return
        }

        if (!load_libs_flag) {
            this.loadLibraries();
            load_libs_flag = true;
        }

        columns_per_page = parseInt(columns_per_page)

        this.resultset(columns_per_page)

        var table_headers = this.table_headers;
        var table_resultset = this.table_resultset;
        var dim_indices = this.dim_indices;
        var dims = this.col_dimension;
        rows_per_page = parseInt(rows_per_page)
      

        console.log("Databinding Info : \n", this.col_dimension, this.col_measure, this.myDataBinding)
        console.log("Split by Columns : ", columns_per_page);
        console.log("Dimesion Indices : ", this.dim_indices);
        console.log("\nExport Table Headers : ", this.table_headers)
        console.log("Table Resultset : ", this.table_resultset)
       
        if(!am4charts) {
            this.loadLibraries();
        }

        var chart = am4core.create(this._root, am4charts.XYChart);

            
        chart.exporting.pdfmake.then(function(pdfmake) {

            var doc = 
            {
                pageSize: "A4",
                pageOrientation: "portrait",
                pageMargins: [25, 25, 25, 25],
                content: [
                    // {
                    //     image:'logo',
                    //     fit: [119, 54]
                    // }
                ],
                images: {
                    logo: {
                      url: 'https://logodix.com/logo/1780400.png',
                    }
                },
            };

            //// Creating Pages based on Columns from SAC
            var pageBreak = "";

            for(var i = 0 ; i < table_headers.length; i++) {

                if(i != 0){
                    pageBreak = "before";  
                }

                doc.content.push( {
                    image:'logo',
                    fit: [119, 54],
                    margin: [0, 0, 0, 15],
                    pageBreak: pageBreak,
                    
                });

                var temp_arr = [JSON.parse(JSON.stringify(table_headers[i]))];

                for(var j = 0; j < table_resultset.length; j++) {
                    if(i == 0) {
                        temp_arr.push(table_resultset[j].slice(0, dim_indices[i]))
                    } else {
                        if(dim_indices[i]) {
                            temp_arr.push(table_resultset[j].slice(dim_indices[i], dim_indices[i] + Object.keys(dims).length + columns_per_page))
                        } else {
                            temp_arr.push(table_resultset[j].slice(dim_indices[i - 1]))
                        }
                    }

                }

                console.log("Page "+ i.toString() +" : ", temp_arr)

                // console.log(temp_arr);

                doc.content.push({
                    table: {
                        headerRows: 1,
                        dontBreakRows: true,
                        // widths: ["*", "*", "*", "*"],
                        body: temp_arr.slice(),
                    },
                });
            }

            pdfmake.createPdf(doc).download("report.pdf");

        });

    }

   
  }
  customElements.define("cw-export-to-pdf", CustomExport);
})();
