/*
 * Open source under the GPLv2 License or later.
 * Copyright (c) 2016, Mac Xu <shinyxxn@hotmail.com>.
 */

var IOTopTable = (function(){
    
    var chartDivName;
    var tableDivName;
    var chartTitle = "IO Top Table";
    var chartHeaderColor = 'yellow';

    var controlElements = {};

    var table;
    
    var maxDataCount = 25;
    var refreshInterval = 5; // in second
    var isChartPaused = false;
    var intervalId;

    var server;
    var requestId;
    var responseId = 0;

    function _init() {
        
        initTable();

        intervalId = setInterval(function () {
            refreshTable();
        }, refreshInterval * 1000);

        // create the control elements( config, resume, pause ), and cache them here.
        controlElements = createControlElements($('#' + chartDivName), chartHeaderColor);
        controlElements.pauseResumeLink.click(function(){
            isChartPaused = onPauseOrResume(controlElements.pauseResumeDiv, isChartPaused, controlElements.headingParentDiv, chartHeaderColor);
        });
        controlElements.configLink.click(function(){
            onConfig(chartTitle + " Configuration",
                updateConfigs,
                refreshInterval, 
                maxDataCount);
        });
    }

    function updateConfigs(newConfigs) {

        maxDataCount = newConfigs.maxDataCount;

        var updatedFlushInterval = newConfigs.flushInterval;
        if (updatedFlushInterval != refreshInterval) {
            refreshInterval = newConfigs.flushInterval;

            clearInterval(intervalId);

            intervalId = setInterval(function () {
                refreshTable();
            }, refreshInterval * 1000);
        }
    }

    function initTable() {
        table = $(tableDivName).DataTable( {
            destroy: true,
            paging: false,
            info: false,
            searching: true,
            columns: [
                { 
                    title: "TID",
                    orderable: false
                },
                { 
                    title: "PRIO",
                    orderable: false 
                },
                { 
                    title: "USER",
                    orderable: false
                },
                { 
                    title: "DISK READ",
                    orderable: false
                },
                { 
                    title: "DISK WRITE",
                    orderable: false
                },
                { 
                    title: "SWAPIN",
                    orderable: false
                },
                { 
                    title: "IO",
                    orderable: true
                },
                { 
                    title: "COMMAND",
                    orderable: false
                }
            ],
            order: [[ 7, "desc" ], [4, "desc"], [5, "desc"], [6, "desc"]]
        });

        refreshTable();
    }

    function refreshTable() {

        if (isChartPaused) {
            return;
        }

        if (requestId - responseId >= 2) {
            //console.log("IO Top Table request busy!");
            return;
        }

        requestId += 1;
        var ajaxTime= new Date().getTime();
        $.get("/status/iotop/" + server + "/" + requestId, function(newData, status){

            var currentTime = new Date().getTime();
            var totalTime = (currentTime - ajaxTime) / 1000;
            responseId = newData['requestId'];
            
            if (isChartPaused) {
                return;
            }

            table.rows().remove().draw( true );
            var topData = newData['topData'];
            if (topData != null) {
                $.each( topData, function( itemIndex, ioTopData ) {

                    if (itemIndex >= maxDataCount) {
                        return;
                    }

                    table.row.add([
                        ioTopData['TID'],
                        ioTopData['PRIO'],
                        ioTopData['USER'],
                        ioTopData['READ'],
                        ioTopData['WRITE'],
                        ioTopData['SWAPIN'],
                        ioTopData['IO'],
                        ioTopData['COMMAND']
                    ]);
                });
            } else {
                var index = 0;
                while(index < maxDataCount) {
                    table.row.add([
                        "--",
                        "--",
                        "--",
                        "--",
                        "--",
                        "--",
                        "--",
                        "--"
                    ]);
                    index = index + 1;
                }
            }
            table.draw(true);
        });
    }

    function setDivName(divName) {
        chartDivName = divName;
    }
    function setTableName(divName) {
        tableDivName = divName;
    }

    function start(serverToMonitor) {

        if (serverToMonitor == server) {
            return;
        }

        server = serverToMonitor;
        requestId = 0;
        responseId = 0;
        
        _init();

        refreshTable();
    }
    
    return {
        setChartDivName: setDivName,
        setTableName:setTableName,
        start: start
    };

})();