import * as vigilo from './vigilo-api';
import Chart from 'chart.js';

export async function init() {
    var data = await vigilo.getIssues();
    last30days(data);

    $("#stats canvas").click((e)=>{
        $(e.target).parent()[0].requestFullscreen()
    })
}

const CATAGORIES = {
    "Véhicule ou objet gênant": { stack: "Cohabitation", color: "crimson" },
    "Incivilité récurrente sur la route": { stack: "Cohabitation", color: "lightcoral" },
    "Aménagement mal conçu": { stack: "Infrastructures", color: "seagreen" },
    "Défaut d'entretien": { stack: "Infrastructures", color: "darkgreen" },
    "Absence d'arceaux de stationnement": { stack: "Infrastructures", color: "turquoise" },
    "Signalisation, marquage": { stack: "Infrastructures", color: "olive" },
    "Absence d'aménagement": { stack: "Infrastructures", color: "cyan" },
    "Accident, chute, incident": { stack: "Autre", color: "black" },
    "Autre": { stack: "Autre", color: "grey" },
}

function truncDateToDay(date){
    truncDateToHour(date)
    date.setHours(0)
}
function truncDateToHour(date){
    date.setMinutes(0)
    date.setSeconds(0)
    date.setMilliseconds(0)
}

async function last30days(issues) {
    // Prepare data
    var data = {};

    var today = new Date()
    truncDateToDay(today)

    for (var cat in CATAGORIES) {
        data[cat] = {
            label: cat,
            data: {},
            borderWidth: 2,
            //stack: CATAGORIES[cat].stack,
            backgroundColor: CATAGORIES[cat].color,
        }
        for (var i = 0; i < 31; i++) {
            var time = today.getTime() - i * 24 * 60 * 60 * 1000;
            data[cat].data[time] = 0
        }
    }

    for (var i in issues) {
        
        var truncated_date = new Date(issues[i].date_obj.getTime())
        truncDateToDay(truncated_date);

        if (data[issues[i].categorie_str].data[truncated_date.getTime()] !== undefined){
            data[issues[i].categorie_str].data[truncated_date.getTime()]++;
        }
    }

    for (var cat in data) {
        data[cat].data = Object.entries(data[cat].data).map((item) => { return { t: new Date(parseInt(item[0])), y: item[1] } })
    }

    data = Object.values(data)
    console.log(data)

    // Display data
    var ctx = document.getElementById('stats-last30days').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: { datasets: data },
        options: {
            title: {
                display: true,
                text: 'Signalements des 30 derniers jours'
            },
            tooltips: {
                mode: 'index',
                intersect: false
            },
            responsive: true,
            scales: {
                xAxes: [{
                    type: 'time',
                    distribution: 'series',
                    time: {
                        minUnit: "day"
                    },
                    ticks: {
                        source: 'data',
                        autoSkip: true
                    },
                    stacked: true
                }],
                yAxes: [{
                    stacked: true
                }]
            }
        }
    });
}