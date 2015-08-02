angular.module('ngFirebaseNotifications', ['firebase'])
	.provider('ngFirebaseNotificationsConfig', function ngFirebaseNotificationsConfigProvider() {
		var baseConfig = {
			firebaseUrl: null, // The base url for the Firebase app
			firbaseQueueBase: '/' // The base path within Firebase where notifications are stored
		};

		/**
         * Set the entire config by merging objects
         * @param {[type]} object [description]
         */
        this.setConfig = function(object) {
            angular.extend(baseConfig, object);
        };


        /**
         * Get the entire config object
         * @return {[type]} [description]
         */
        this.getConfig = function() {
            return baseConfig;
        };


        /**
         * Get a single config value based on key
         * @return {[type]} [description]
         */
        this.getConfigValue = function(key) {
            return baseConfig[key];
        };

		/**
         * The required $get method
         * @return {[type]} [description]
         */
        this.$get = function() {

            return {
                get: this.getConfigValue
            };

        };

        return this;
	});