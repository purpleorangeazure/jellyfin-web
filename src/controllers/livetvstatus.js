import $ from 'jQuery';
import globalize from 'globalize';
import taskButton from 'scripts/taskbutton';
import dom from 'dom';
import layoutManager from 'layoutManager';
import loading from 'loading';
import browser from 'browser';
import 'listViewStyle';
import 'flexStyles';
import 'emby-itemscontainer';
import 'cardStyle';
import 'material-icons';
import 'emby-button';

const enableFocusTransform = !browser.slow && !browser.edge;

function getDeviceHtml(device) {
    const padderClass = 'cardPadder-backdrop';
    let cssClass = 'card scalableCard backdropCard backdropCard-scalable';
    const cardBoxCssClass = 'cardBox visualCardBox';
    let html = '';

    // TODO move card creation code to Card component

    if (layoutManager.tv) {
        cssClass += ' show-focus';

        if (enableFocusTransform) {
            cssClass += ' show-animation';
        }
    }

    html += '<div type="button" class="' + cssClass + '" data-id="' + device.Id + '">';
    html += '<div class="' + cardBoxCssClass + '">';
    html += '<div class="cardScalable visualCardBox-cardScalable">';
    html += '<div class="' + padderClass + '"></div>';
    html += '<div class="cardContent searchImage">';
    html += '<div class="cardImageContainer coveredImage"><span class="cardImageIcon material-icons dvr"></span></div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="cardFooter visualCardBox-cardFooter">';
    html += '<button is="paper-icon-button-light" class="itemAction btnCardOptions autoSize" data-action="menu"><span class="material-icons more_vert"></span></button>';
    html += '<div class="cardText">' + (device.FriendlyName || getTunerName(device.Type)) + '</div>';
    html += '<div class="cardText cardText-secondary">';
    html += device.Url || '&nbsp;';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html += '</div>';
}

function renderDevices(page, devices) {
    page.querySelector('.devicesList').innerHTML = devices.map(getDeviceHtml).join('');
}

function deleteDevice(page, id) {
    const message = globalize.translate('MessageConfirmDeleteTunerDevice');

    import('confirm').then(({default: confirm}) => {
        confirm(message, globalize.translate('HeaderDeleteDevice')).then(function () {
            loading.show();
            ApiClient.ajax({
                type: 'DELETE',
                url: ApiClient.getUrl('LiveTv/TunerHosts', {
                    Id: id
                })
            }).then(function () {
                reload(page);
            });
        });
    });
}

function reload(page) {
    loading.show();
    ApiClient.getNamedConfiguration('livetv').then(function (config) {
        renderDevices(page, config.TunerHosts);
        renderProviders(page, config.ListingProviders);
    });
    loading.hide();
}

function submitAddDeviceForm(page) {
    page.querySelector('.dlgAddDevice').close();
    loading.show();
    ApiClient.ajax({
        type: 'POST',
        url: ApiClient.getUrl('LiveTv/TunerHosts'),
        data: JSON.stringify({
            Type: $('#selectTunerDeviceType', page).val(),
            Url: $('#txtDevicePath', page).val()
        }),
        contentType: 'application/json'
    }).then(function () {
        reload(page);
    }, function () {
        Dashboard.alert({
            message: globalize.translate('ErrorAddingTunerDevice')
        });
    });
}

function renderProviders(page, providers) {
    let html = '';

    if (providers.length) {
        html += '<div class="paperList">';

        for (let i = 0, length = providers.length; i < length; i++) {
            const provider = providers[i];
            html += '<div class="listItem">';
            html += '<span class="listItemIcon material-icons dvr"></span>';
            html += '<div class="listItemBody two-line">';
            html += '<a is="emby-linkbutton" style="display:block;padding:0;margin:0;text-align:left;" class="clearLink" href="' + getProviderConfigurationUrl(provider.Type) + '&id=' + provider.Id + '">';
            html += '<h3 class="listItemBodyText">';
            html += getProviderName(provider.Type);
            html += '</h3>';
            html += '<div class="listItemBodyText secondary">';
            html += provider.Path || provider.ListingsId || '';
            html += '</div>';
            html += '</a>';
            html += '</div>';
            html += '<button type="button" is="paper-icon-button-light" class="btnOptions" data-id="' + provider.Id + '"><span class="material-icons listItemAside more_vert"></span></button>';
            html += '</div>';
        }

        html += '</div>';
    }

    const elem = $('.providerList', page).html(html);
    $('.btnOptions', elem).on('click', function () {
        const id = this.getAttribute('data-id');
        showProviderOptions(page, id, this);
    });
}

function showProviderOptions(page, providerId, button) {
    const items = [];
    items.push({
        name: globalize.translate('Delete'),
        id: 'delete'
    });
    items.push({
        name: globalize.translate('MapChannels'),
        id: 'map'
    });

    import('actionsheet').then(({default: actionsheet}) => {
        actionsheet.show({
            items: items,
            positionTo: button
        }).then(function (id) {
            switch (id) {
                case 'delete':
                    deleteProvider(page, providerId);
                    break;

                case 'map':
                    mapChannels(page, providerId);
            }
        });
    });
}

function mapChannels(page, providerId) {
    import('components/channelMapper/channelMapper').then(({default: channelMapper}) => {
        new channelMapper({
            serverId: ApiClient.serverInfo().Id,
            providerId: providerId
        }).show();
    });
}

function deleteProvider(page, id) {
    const message = globalize.translate('MessageConfirmDeleteGuideProvider');

    import('confirm').then(({default: confirm}) => {
        confirm(message, globalize.translate('HeaderDeleteProvider')).then(function () {
            loading.show();
            ApiClient.ajax({
                type: 'DELETE',
                url: ApiClient.getUrl('LiveTv/ListingProviders', {
                    Id: id
                })
            }).then(function () {
                reload(page);
            }, function () {
                reload(page);
            });
        });
    });
}

function getTunerName(providerId) {
    switch (providerId = providerId.toLowerCase()) {
        case 'm3u':
            return 'M3U';
        case 'hdhomerun':
            return 'HDHomeRun';
        case 'hauppauge':
            return 'Hauppauge';
        case 'satip':
            return 'DVB';
        default:
            return 'Unknown';
    }
}

function getProviderName(providerId) {
    switch (providerId = providerId.toLowerCase()) {
        case 'schedulesdirect':
            return 'Schedules Direct';
        case 'xmltv':
            return 'XMLTV';
        default:
            return 'Unknown';
    }
}

function getProviderConfigurationUrl(providerId) {
    switch (providerId = providerId.toLowerCase()) {
        case 'xmltv':
            return 'livetvguideprovider.html?type=xmltv';
        case 'schedulesdirect':
            return 'livetvguideprovider.html?type=schedulesdirect';
    }
}

function addProvider(button) {
    const menuItems = [];
    menuItems.push({
        name: 'Schedules Direct',
        id: 'SchedulesDirect'
    });
    menuItems.push({
        name: 'XMLTV',
        id: 'xmltv'
    });

    import('actionsheet').then(({default: actionsheet}) => {
        actionsheet.show({
            items: menuItems,
            positionTo: button,
            callback: function (id) {
                Dashboard.navigate(getProviderConfigurationUrl(id));
            }
        });
    });
}

function addDevice(button) {
    Dashboard.navigate('livetvtuner.html');
}

function showDeviceMenu(button, tunerDeviceId) {
    const items = [];
    items.push({
        name: globalize.translate('Delete'),
        id: 'delete'
    });
    items.push({
        name: globalize.translate('Edit'),
        id: 'edit'
    });

    import('actionsheet').then(({default: actionsheet}) => {
        actionsheet.show({
            items: items,
            positionTo: button
        }).then(function (id) {
            switch (id) {
                case 'delete':
                    deleteDevice(dom.parentWithClass(button, 'page'), tunerDeviceId);
                    break;

                case 'edit':
                    Dashboard.navigate('livetvtuner.html?id=' + tunerDeviceId);
            }
        });
    });
}

function onDevicesListClick(e) {
    const card = dom.parentWithClass(e.target, 'card');

    if (card) {
        const id = card.getAttribute('data-id');
        const btnCardOptions = dom.parentWithClass(e.target, 'btnCardOptions');

        if (btnCardOptions) {
            showDeviceMenu(btnCardOptions, id);
        } else {
            Dashboard.navigate('livetvtuner.html?id=' + id);
        }
    }
}

export default function () {
    $(document).on('pageinit', '#liveTvStatusPage', function () {
        const page = this;
        $('.btnAddDevice', page).on('click', function () {
            addDevice(this);
        });
        $('.formAddDevice', page).on('submit', function () {
            submitAddDeviceForm(page);
            return false;
        });
        $('.btnAddProvider', page).on('click', function () {
            addProvider(this);
        });
        page.querySelector('.devicesList').addEventListener('click', onDevicesListClick);
    }).on('pageshow', '#liveTvStatusPage', function () {
        const page = this;
        reload(page);
        taskButton({
            mode: 'on',
            progressElem: page.querySelector('.refreshGuideProgress'),
            taskKey: 'RefreshGuide',
            button: page.querySelector('.btnRefresh')
        });
    }).on('pagehide', '#liveTvStatusPage', function () {
        const page = this;
        taskButton({
            mode: 'off',
            progressElem: page.querySelector('.refreshGuideProgress'),
            taskKey: 'RefreshGuide',
            button: page.querySelector('.btnRefresh')
        });
    });
}
