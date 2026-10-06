import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
Chart.register(...registerables);
Chart.defaults.plugins.legend.position = "bottom";
Chart.defaults.maintainAspectRatio = false;

export async function init() {
    var data = await vigilo.getIssues();
    makeStats(data);
}

function truncDateToDay(date) {
    truncDateToHour(date)
    date.setHours(0)
}
function truncDateToHour(date) {
    date.setMinutes(0)
    date.setSeconds(0)
    date.setMilliseconds(0)
}

function onChartResize(chart, size) {
    if (size.height < 250) {
        chart.canvas.parentNode.style.height = '350px';
    }
}
async function makeStats(issues) {
    // Prepare data structures
    var dataLast30Days = {};
    var dataByCat = {};
    var dataByCatLabel = [];

    var today = new Date()
    truncDateToDay(today)

    var cats = await vigiloconfig.getCategories();

    for (var cat in cats) {
        dataLast30Days[cat] = {
            label: cats[cat].name,
            data: {},
            borderWidth: 2,
            backgroundColor: cats[cat].color,
        }
        for (var i = 0; i < 31; i++) {
            // Step by calendar day (not 24h) so local midnights stay aligned across DST changes
            var day = new Date(today.getTime());
            day.setDate(day.getDate() - i);
            dataLast30Days[cat].data[day.getTime()] = 0
        }

        dataByCat[cats[cat].id] = 0;
        dataByCatLabel.push(cats[cat].name);
    }

    // Compute data
    var totalDataLast30Days = 0;
    var total = issues.length;

    for (var i in issues) {
        if (dataLast30Days[issues[i].categorie] === undefined) {
            // Unknown category (missing from categorielist.json)
            continue;
        }

        var truncated_date = new Date(issues[i].date_obj.getTime())
        truncDateToDay(truncated_date);

        if (dataLast30Days[issues[i].categorie].data[truncated_date.getTime()] !== undefined) {
            dataLast30Days[issues[i].categorie].data[truncated_date.getTime()]++;
            totalDataLast30Days++;
        }

        dataByCat[issues[i].categorie]++;
    }

    // Refactor data
    for (var cat in dataLast30Days) {
        dataLast30Days[cat].data = Object.entries(dataLast30Days[cat].data).map((item) => { return { x: parseInt(item[0]), y: item[1] } })
    }
    dataLast30Days = Object.values(dataLast30Days)

    // Display data
    $("#stats-last30days h2").empty().append(totalDataLast30Days)
    new Chart($("#stats-last30days canvas")[0].getContext('2d'), {
        type: 'bar',
        data: { datasets: dataLast30Days },
        options: {
            onResize: onChartResize,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            responsive: true,
            scales: {
                x: {
                    // 'timeseries' = one evenly spaced bar per day (was distribution: 'series' in Chart.js 2)
                    type: 'timeseries',
                    time: {
                        minUnit: "day"
                    },
                    ticks: {
                        source: 'data',
                        autoSkip: true
                    },
                    stacked: true
                },
                y: {
                    stacked: true
                }
            }
        }
    });

    $("#stats-bycats h2").empty().append(total)
    new Chart($("#stats-bycats canvas")[0].getContext('2d'), {
        type: 'pie',
        data: {
            datasets: [
                {
                    data: Object.values(dataByCat),
                    backgroundColor: Object.values(cats).map((x)=>x.color)
                }
            ],
            labels: dataByCatLabel
        },
        options: {
            onResize: onChartResize,
            responsive: true,
        }
    });
}
