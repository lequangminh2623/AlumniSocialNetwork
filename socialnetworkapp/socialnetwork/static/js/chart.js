function drawUserStats(labels, data){

    const ctx = document.getElementById('userChart');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Người dùng',
                data: data,
                borderWidth: 2,
                backgroundColor: ["rgba(255, 87, 51, 0.8)", "rgba(51, 255, 87, 0.8)", "rgba(51, 87, 255, 0.8)", "rgba(255, 51, 161, 0.8)",
                                  "rgba(161, 51, 255, 0.8)", "rgba(51, 255, 245, 0.8)", "rgba(245, 255, 51, 0.8)", "rgba(255, 140, 51, 0.8)",
                                  "rgba(140, 255, 51, 0.8)", "rgba(51, 140, 255, 0.8)", "rgba(255, 51, 140, 0.8)", "rgba(140, 51, 255, 0.8)",
                                  "rgba(51, 255, 140, 0.8)", "rgba(255, 199, 51, 0.8)", "rgba(199, 51, 255, 0.8)", "rgba(51, 199, 255, 0.8)",
                                  "rgba(255, 51, 199, 0.8)", "rgba(255, 111, 51, 0.8)", "rgba(111, 255, 51, 0.8)", "rgba(51, 111, 255, 0.8)",
                                  "rgba(255, 51, 111, 0.8)", "rgba(111, 51, 255, 0.8)", "rgba(51, 255, 111, 0.8)", "rgba(255, 214, 51, 0.8)",
                                  "rgba(214, 51, 255, 0.8)", "rgba(51, 214, 255, 0.8)", "rgba(255, 51, 214, 0.8)", "rgba(255, 165, 51, 0.8)",
                                  "rgba(165, 255, 51, 0.8)", "rgba(51, 165, 255, 0.8)", "rgba(255, 51, 165, 0.8)"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'white',
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: 'white'
                    },
                    beginAtZero: true
                }
            }
        }
    });

}