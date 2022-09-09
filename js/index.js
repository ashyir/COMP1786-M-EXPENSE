let ERROR = 'ERROR';
let currentTripId = 'currentTripId';
let db = window.openDatabase('FGW', '1.0', 'FGW', 20000);

$(document).on('ready', onDeviceReady);

$(document).on('vclick', '#page-home #panel-open', function () {
    $('#page-home #panel').panel('open');
});

$(document).on('vclick', '#page-create #panel-open', function () {
    $('#page-create #panel').panel('open');
});

$(document).on('vclick', '#page-list #panel-open', function () {
    $('#page-list #panel').panel('open');
});

$(document).on('vclick', '#page-about #panel-open', function () {
    $('#page-about #panel').panel('open');
});

// Page CREATE
$(document).on('submit', '#page-create #frm-register', confirmTrip);
$(document).on('submit', '#page-create #frm-confirm', registerTrip);
$(document).on('vclick', '#page-create #frm-confirm #edit', function () {
    $('#page-create #frm-confirm').popup('close');
});

// Page LIST
$(document).on('pagebeforeshow', '#page-list', showList);

$(document).on('submit', '#page-list #frm-search', search);

$(document).on('keyup', $('#page-list #txt-filter'), filterTrip);

$(document).on('vclick', '#page-list #btn-reset', showList);
$(document).on('vclick', '#page-list #btn-filter-popup', openFormSearch);
$(document).on('vclick', '#page-list #list-trip li a', navigatePageDetail);

// Page DETAIL
$(document).on('pagebeforeshow', '#page-detail', showDetail);

$(document).on('vclick', '#page-detail #btn-toggle-expense', function () {
    var expenseDisplay = $('#page-detail #expense').css('display');

    $('#page-detail #expense').css('display', expenseDisplay == 'none' ? 'block' : 'none');
});

$(document).on('vclick', '#page-detail #btn-update-popup', showUpdate);
$(document).on('vclick', '#page-detail #btn-delete-popup', function () {
    changePopup($('#page-detail #option'), $('#page-detail #frm-delete'));
});

$(document).on('vclick', '#page-detail #frm-update #cancel', function () {
    $('#page-detail #frm-update').popup('close');
});

$(document).on('vclick', '#page-detail #frm-add-expense #cancel', function () {
    $('#page-detail #frm-add-expense').popup('close');
});

$(document).on('submit', '#page-detail #frm-update', updateTrip);
$(document).on('submit', '#page-detail #frm-delete', deleteTrip);
$(document).on('submit', '#page-detail #frm-add-expense', addExpense);
$(document).on('keyup', '#page-detail #frm-delete #txt-confirm', confirmDeleteTrip);

function onDeviceReady() {
    log(`Device is ready.`);

    prepareDatabase(db);
}

function log(message, type = 'INFO') {
    console.log(`${new Date()} [${type}] ${message}`);
}

function changePopup(sourcePopup, destinationPopup) {
    let afterClose = function () {
        destinationPopup.popup("open");
        sourcePopup.off("popupafterclose", afterClose);
    };

    sourcePopup.on("popupafterclose", afterClose);
    sourcePopup.popup("close");
}

function confirmTrip(e) {
    e.preventDefault();

    log('Open the confirmation popup.');

    $('#page-create #frm-confirm #name').text($('#page-create #frm-register #name').val());
    $('#page-create #frm-confirm #destination').text($('#page-create #frm-register #destination').val());
    $('#page-create #frm-confirm #date').text($('#page-create #frm-register #date').val());
    $('#page-create #frm-confirm #description').text($('#page-create #frm-register #description').val());
    $('#page-create #frm-confirm #risk').text($('#page-create #frm-register #risk').val());

    $('#page-create #frm-confirm').popup('open');
}

function registerTrip(e) {
    e.preventDefault();

    let name = $('#page-create #frm-register #name').val();
    let destination = $('#page-create #frm-register #destination').val();
    let date = $('#page-create #frm-register #date').val();
    let description = $('#page-create #frm-register #description').val();
    let risk = $('#page-create #frm-register #risk').val();

    db.transaction(function (tx) {
        let query = `INSERT INTO Trip (Name, Destination, Description, Risk, Date) VALUES (?, ?, ?, ?, julianday('${date}'))`;
        tx.executeSql(query, [name, destination, description, risk], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            log(`Create a trip '${name}' successfully.`);

            $('#page-create #frm-register').trigger('reset');
            $('#page-create #frm-register #name').focus();

            $('#page-create #frm-confirm').popup('close');
        }
    });
}

function showList() {
    db.transaction(function (tx) {
        let query = `SELECT *, date(Date) AS DateConverted FROM Trip`;

        tx.executeSql(query, [], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            log(`Get list of trips successfully.`);
            displayList(result.rows);
        }
    });
}

function navigatePageDetail(e) {
    e.preventDefault();

    let id = $(this).data('details').Id;
    localStorage.setItem(currentTripId, id);

    $.mobile.navigate('#page-detail', { transition: 'none' });
}

function showDetail() {
    let id = localStorage.getItem(currentTripId);

    db.transaction(function (tx) {
        let query = `SELECT *, date(Date) AS DateConverted FROM Trip WHERE Id = ?`;

        tx.executeSql(query, [id], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            if (result.rows[0] != null) {
                log(`Get details of trip '${result.rows[0].name}' successfully.`);

                $('#page-detail #detail #name').text(result.rows[0].Name);
                $('#page-detail #detail #destination').text(result.rows[0].Destination);
                $('#page-detail #detail #description').text(result.rows[0].Description);
                $('#page-detail #detail #risk').text(result.rows[0].Risk);
                $('#page-detail #detail #date').text(result.rows[0].DateConverted);

                showExpense();
            }
            else {
                let errorMessage = 'Trip not found.';

                log(errorMessage, ERROR);

                $('#page-detail #detail #name').text(errorMessage);
                $('#page-detail #btn-update').addClass('ui-disabled');
                $('#page-detail #btn-delete-confirm').addClass('ui-disabled');
            }
        }
    });
}

function confirmDeleteTrip() {
    let text = $('#page-detail #frm-delete #txt-confirm').val();

    if (text == 'confirm delete') {
        $('#page-detail #frm-delete #btn-delete').removeClass('ui-disabled');
    }
    else {
        $('#page-detail #frm-delete #btn-delete').addClass('ui-disabled');
    }
}

function deleteTrip(e) {
    e.preventDefault();

    let tripId = localStorage.getItem(currentTripId);

    db.transaction(function (tx) {
        let query = 'DELETE FROM Expense WHERE TripId = ?';
        tx.executeSql(query, [tripId], function (tx, result) {
            log(`Delete expenses of trip '${tripId}' successfully.`);
        }, transactionError);

        query = 'DELETE FROM Trip WHERE Id = ?';
        tx.executeSql(query, [tripId], function (tx, result) {
            log(`Delete trip '${tripId}' successfully.`);

            $('#page-detail #frm-delete').trigger('reset');

            $.mobile.navigate('#page-list', { transition: 'none' });
        }, transactionError);
    });
}

function addExpense(e) {
    e.preventDefault();

    let tripId = localStorage.getItem(currentTripId);
    let type = $('#page-detail #frm-add-expense #type').val();
    let amount = parseInt($('#page-detail #frm-add-expense #amount').val());
    let date = $('#page-detail #frm-add-expense #date').val();
    let time = $('#page-detail #frm-add-expense #time').val();
    let comment = $('#page-detail #frm-add-expense #comment').val();

    db.transaction(function (tx) {
        let query = `INSERT INTO Expense (Type, Amount, Comment, TripId, Date, Time) VALUES (?, ?, ?, ?, julianday('${date}'), julianday('${time}'))`;
        tx.executeSql(query, [type, amount, comment, tripId], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            log(`Add new expense to trip '${tripId}' successfully.`);

            $('#page-detail #frm-add-expense').trigger('reset');
            $('#page-detail #frm-add-expense').popup('close');

            showExpense();
        }
    });
}

function showExpense() {
    let id = localStorage.getItem(currentTripId);

    db.transaction(function (tx) {
        let query = `SELECT *, date(Date) AS DateConverted, time(Time) AS TimeConverted FROM Expense WHERE TripId = ? ORDER BY Date DESC, Time DESC`;

        tx.executeSql(query, [id], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            log(`Get list of expenses successfully.`);

            let expenseList = '';
            let currentDate = '';
            for (let expense of result.rows) {
                if (currentDate != expense.DateConverted) {
                    expenseList += `<div class='list-date'>${expense.DateConverted}</div>`;
                    currentDate = expense.DateConverted;
                }

                expenseList += `
                    <div class='list'>
                        <table style='white-space: nowrap; width: 100%;'>
                            <tr style='height: 25px;'>
                                <td>${expense.Type}: ${expense.Amount.toLocaleString('en-US')} VNĐ</td>
                                <td style='text-align: right;'>${expense.TimeConverted}</td>
                            </tr>

                            <tr>
                                <td colspan='2'><em>${expense.Comment}</em></td>
                            </tr>
                        </table>
                    </div>`;
            }

            expenseList += `<div class='list end-list'>You've reached the end of the list.</div>`;

            $('#page-detail #expense #list').empty().append(expenseList);

            log(`Show list of expenses successfully.`);
        }
    });
}

function showUpdate() {
    var id = localStorage.getItem(currentTripId);

    db.transaction(function (tx) {
        var query = `SELECT * FROM Trip WHERE Id = ?`;

        tx.executeSql(query, [id], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            if (result.rows[0] != null) {
                log(`Get details of trip '${result.rows[0].Name}' successfully.`);

                $(`#page-detail #frm-update #name`).val(result.rows[0].Name);
                $(`#page-detail #frm-update #street`).val(result.rows[0].Street);
                $(`#page-detail #frm-update #price`).val(result.rows[0].Price);
                $(`#page-detail #frm-update #bedroom`).val(result.rows[0].Bedroom);
                $(`#page-detail #frm-update #reporter`).val(result.rows[0].Reporter);

                addAddressOption($('#page-detail #frm-update #city'), 'City', result.rows[0].City);
                addAddressOption_District($('#page-detail #frm-update #district'), result.rows[0].City, result.rows[0].District);
                addAddressOption_Ward($('#page-detail #frm-update #ward'), result.rows[0].District, result.rows[0].Ward);

                addOption($('#page-detail #frm-update #type'), Type, 'Type', result.rows[0].Type);
                addOption($('#page-detail #frm-update #furniture'), Furniture, 'Furniture', result.rows[0].Furniture);

                changePopup($('#page-detail #option'), $('#page-detail #frm-update'));
            }
        }
    });
}

function updateTrip(e) {
    e.preventDefault();

    if (isValid('#page-detail #frm-update')) {
        var id = localStorage.getItem(currentTripId);
        var info = getFormInfoByValue('#page-detail #frm-update', false);

        db.transaction(function (tx) {
            var query = `UPDATE Trip
                        SET Name = ?,
                            Street = ?, City = ?, District = ?, Ward = ?,
                            Type = ?, Bedroom = ?, Price = ?, Furniture = ?, Reporter = ?,
                            DateAdded = julianday('now')
                        WHERE Id = ?`;

            tx.executeSql(query, [info.Name, info.Street, info.City, info.District, info.Ward, info.Type, info.Bedroom, info.Price, info.Furniture, info.Reporter, id], transactionSuccess, transactionError);

            function transactionSuccess(tx, result) {
                log(`Update trip '${info.Name}' successfully.`);

                showDetail();

                $('#page-detail #frm-update').popup('close');
            }
        });
    }
}

function filterTrip() {
    var filter = $('#page-list #txt-filter').val().toLowerCase();
    var li = $('#page-list #list-trip ul li');

    for (var i = 0; i < li.length; i++) {
        var a = li[i].getElementsByTagName("a")[0];
        var text = a.textContent || a.innerText;

        li[i].style.display = text.toLowerCase().indexOf(filter) > -1 ? "" : "none";
    }
}

function openFormSearch(e) {
    e.preventDefault();
    $('#page-list #frm-search').popup('open');
}

function search(e) {
    e.preventDefault();

    var name = $('#page-list #frm-search #name').val();
    var street = $('#page-list #frm-search #street').val();
    var city = $('#page-list #frm-search #city').val();
    var district = $('#page-list #frm-search #district').val();
    var ward = $('#page-list #frm-search #ward').val();
    var type = $('#page-list #frm-search #type').val();
    var bedroom = $('#page-list #frm-search #bedroom').val();
    var furniture = $('#page-list #frm-search #furniture').val();
    var reporter = $('#page-list #frm-search #reporter').val();
    var priceMin = $('#page-list #frm-search #price-min').val();
    var priceMax = $('#page-list #frm-search #price-max').val();

    db.transaction(function (tx) {
        var query = `SELECT Trip.Id AS Id, Trip.Name AS Name, Price, Bedroom, Type, City.Name AS City
                     FROM Trip LEFT JOIN City ON Trip.City = City.Id
                     WHERE`;

        query += name ? ` Trip.Name LIKE "%${name}%"   AND` : '';
        query += street ? ` Street LIKE "%${street}%"   AND` : '';
        query += city != -1 ? ` City = ${city}   AND` : '';
        query += district != -1 ? ` District = ${district}   AND` : '';
        query += ward != -1 ? ` Ward = ${ward}   AND` : '';
        query += type != -1 ? ` Type = ${type}   AND` : '';
        query += bedroom ? ` Bedroom = ${bedroom}   AND` : '';
        query += furniture != -1 ? ` Furniture = ${furniture}   AND` : '';
        query += reporter ? ` Reporter LIKE "%${reporter}%"   AND` : '';
        query += priceMin ? ` Price >= ${priceMin}   AND` : '';
        query += priceMax ? ` Price <= ${priceMax}   AND` : '';

        query = query.substring(0, query.length - 6);

        tx.executeSql(query, [], transactionSuccess, transactionError);

        function transactionSuccess(tx, result) {
            log(`Search properties successfully.`);

            displayList(result.rows);

            $('#page-list #frm-search').trigger('reset');
            $('#page-list #frm-search').popup('close');
        }
    });
}

function displayList(list) {
    let tripList = `<ul id='list-trip' data-role='listview' class='ui-nodisc-icon ui-alt-icon'>`;

    tripList += list.length == 0 ? '<li><h2>There is no trip.</h2></li>' : '';

    for (let trip of list) {
        tripList +=
            `<li><a data-details='{"Id" : ${trip.Id}}'>
                <h2 style='margin-bottom: 0px;'>${trip.Name}</h2>
                <p style='margin-top: 2px; margin-bottom: 10px;'><small>${trip.Destination}</small></p>
                
                <div>
                    <img src='img/icon-date.png' height='20px' style='margin-bottom: -5px;'>
                    <strong style='font-size: 13px;'>${trip.DateConverted}<strong>
                    
                    &nbsp;&nbsp;
                    
                    <img src='img/icon-type.png' height='21px' style='margin-bottom: -5px;'>
                    <strong style='font-size: 13px;'>${trip.Risk}<strong>
                </div>
            </a></li>`;
    }
    tripList += `</ul>`;

    $('#list-trip').empty().append(tripList).listview('refresh').trigger('create');

    log(`Show list of trips successfully.`);
}