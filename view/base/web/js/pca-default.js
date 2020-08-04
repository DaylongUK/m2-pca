define([
    'jquery'
], function($){
    "use strict";

    return function (config, element) {
        (function (a, c, b, e) {
            a[b] = a[b] || {};
            a[b].initial = {accountCode: config.pcaAccCode, host: config.pcaAccCode + ".pcapredict.com"};
            a[b].on = a[b].on || function () {
                (a[b].onq = a[b].onq || []).push(arguments)
            };
            var d = c.createElement("script");
            d.async = !0;
            d.src = e;
            c = c.getElementsByTagName("script")[0];
            c.parentNode.insertBefore(d, c)
        })(window, document, "pca", "/" + "/" + config.pcaAccCode + ".pcapredict.com/js/sensor.js");

        pca.magento = pca.magento || {};
        pca.magento.currentUrl = window.location.href;
        pca.magento.checkout = false;

        pca.magento.isElementVisible = function( elem ) {
            return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
        };

        pca.magento.setupCheckout = function(){
            pca.magento.checkout = true;
            pca.magento.doLoad();
        };

        pca.on('data', function(source, key, address, variations) {
            switch (source) {
                case "address":
                    if (pca.magento.checkout)
                    {
                        // Because magento is using form validation on each field we need to fire a change on the fields we populate.
                        var provinceField = null;
                        for(var c = 0; c< pca.capturePlus.controls.length; c++){
                            var cont = pca.capturePlus.controls[c];
                            if(cont.key == key){
                                for(var f = 0; f < cont.fields.length; f++){
                                    var element = pca.getElement(cont.fields[f].element);
                                    if(cont.fields[f].field === '{ProvinceName}'){
                                        provinceField = element;
                                    }
                                    pca.fire(element, 'change');
                                }
                            }
                        }
                        if(provinceField){
                            pca.setValue(provinceField, address.ProvinceName);
                            pca.fire(provinceField, 'change');
                        }
                    }
                    break;
            }
        });

        // This bit of code was written to accommodate the Magento 2 DOM element fields with the same name and dynamic id's.
        // We are doing the equivalent of the following :
        // 1) Recording the amount of times the address fields are on the page, e.g. How many times is the "Postcode" element on the page.
        // 2) Taking each set in turn and getting the dynamic id's that relate to the names. e.g. <input name="postcode" id="D6G65BGS" ...
        // 3) For each of those id's we rewrite the mappings for a key. Control[Index].Mappings.Postcode = BGH34DF (pseudo-code)
        // 4) Reload the controls - this should then reduce down the number of found mappings as they have been re-written to the new id's.
        var loadHitCounter = 0;
        pca.on("load", function(type, key, control){
            if(type == "capture+"){
                for(var f = 0; f < control.fields.length; f++){
                    if(control.fields[f].element.indexOf('wait_') == 0){
                        control.fields[f].element = control.fields[f].element.replace('wait_', '');
                    }
                    if(document.getElementById(control.fields[f].element)){
                        //ignore
                    }else{
                        var elementsMatchedByName = document.getElementsByName(control.fields[f].element);

                        if(elementsMatchedByName.length > loadHitCounter){
                            control.fields[f].element = elementsMatchedByName[loadHitCounter].id;
                        }else{
                            control.fields[f].element = "wait_" + control.fields[f].element;
                        }
                    }
                }
                control.reload();
                loadHitCounter++;
            }
        });

        pca.magento.reloadPCA = function() {
            if (console && console.log) console.log("Loading PCA");
            loadHitCounter = 0;
            pca.load();
        }

        pca.magento.loadPCA = function() {

            pca.magento.reloadPCA();

            // If you login while in the checkout and add a new address, it will show a popup view.
            var buttons = document.getElementsByTagName('button');
            for (var b = 0; b < buttons.length; b++) {
                if (buttons[b].className.indexOf('action-show-popup') > -1) {
                    //onclick
                    $(buttons[b]).off('click.pca').on('click.pca', function(){
                        pca.magento.reloadPCA();
                    });
                }
            }

            // Toggle button for adding billing fields on checkout single step.
            var els = document.getElementsByName('billing-address-same-as-shipping');
            if (els && els.length) {
                for (var i=0; i < els.length; i++) {
                    //onclick
                    $(els[i]).off('click.pca').on('click.pca', function(){
                        if (this.checked === false) {
                            pca.magento.reloadPCA();
                        }
                    });
                }
            }

            // Logged in user can select an address on billing screen or add a new one.
            var els = document.getElementsByName('billing_address_id');
            if (els && els.length) {
                for (var i=0; i < els.length; i++) {
                    // onchange
                    $(els[i]).off('change.pca').on('change.pca', function(){
                        pca.magento.reloadPCA();
                    });
                }
            }

            // This is so we can reload the mappings to find the next set of address fields.
            // NOTE - Monitor Fields and Continual Field Search could potenially remove this.
            if (pca.magento.checkout) {
                pca.magento.checkUrlChange();
            }
        };

        pca.magento.checkUrlChange = function() {
            if (window.location.href != pca.magento.currentUrl) {
                pca.magento.currentUrl = window.location.href;
                window.setTimeout(pca.magento.loadPCA, 500);
            }
            else {
                window.setTimeout(pca.magento.checkUrlChange, 1000);
            }
        };

        // Checks for the dynamic fields are on the page - Means we will need to reload the view to perform the dynamic mapping above.
        pca.magento.dynamicMagentoFieldsExist = function() {

            var isDynamicRegExp = new RegExp("^[A-Z0-9]{7}$"); // Magento 2 - 7 character dynamic id's.
            var col = document.getElementsByTagName("*");

            for (var i = 0; i < col.length; i++) {
                if (isDynamicRegExp.test(col[i].id) && pca.magento.isElementVisible(col[i])) {
                    return true;
                }
            }
        }

        pca.magento.doLoad = function() {
            // Load when ready.
            if (pca &&
                pca.platform &&
                typeof pca.platform.elementExists === 'function' &&
                (pca.platform.getBindingsForService("PLATFORM_CAPTUREPLUS").length > 0
                    || pca.platform.getBindingsForService("PLATFORM_MOBILEVALIDATION").length > 0
                    || pca.platform.getBindingsForService("PLATFORM_EMAILVALIDATION").length > 0)
                && (!pca.magento.checkout || pca.magento.dynamicMagentoFieldsExist())) {

                window.setTimeout(pca.magento.loadPCA, 500);
            }
            else {
                // re-set the timeout
                window.setTimeout(pca.magento.doLoad, 500);
            }
        };
    };
});