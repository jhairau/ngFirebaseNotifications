/**
 * Angular + Firebase Notifications Service for publishing & subscribing to topics
 * @version v0.0.1 - 2015-08-03
 * @link https://github.com/jhairau/ngFirebaseNotifications
 * @author Johnathan Hair <johnathan.hair.au@gmail.com>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function ( window, angular, undefined ) {
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
angular.module('ngFirebaseNotifications')
	.service('ngFirebaseNotifications', ['ngFirebaseNotificationsConfig', '$firebaseArray', function ngFirebaseNotifications(ngFirebaseNotificationsConfig, $firebaseArray) {
		
		// Variables
		var firebaseUrl = ngFirebaseNotificationsConfig.get('firebaseUrl');
		var firbaseQueueBase = ngFirebaseNotificationsConfig.get('firbaseQueueBase');
		var queueRef = new Firebase(firebaseUrl).child(firbaseQueueBase);

		var Notification = $firebaseArray.$extend({

			// List of subscriptions
			$subscriptions: [],

			// A copy of the updated data
			$updatedData: {},

			/**
			 * Add a callback method to the subscribers list
			 * @param  {Function} callback [description]
			 * @return {[type]}            [description]
			 */
			subscribe: function(subject, callback) {

				var self = this;

				// we only want to place subs on
				this.$loaded().then(function(){
					var data = {};
					data.subject = angular.isFunction(subject) ? null : subject;
					data.callback = angular.isFunction(subject) ? subject : callback;

					self.$subscriptions.push(data);
				});
			},

			/**
			 * Publish a message on the topic
			 * @param  {[type]} subject [description]
			 * @param  {[type]} message [description]
			 * @return {[type]}         [description]
			 */
			publish: function(subject, message) {
				// todo: add user id
				this.$add({
					subject: subject,
					message: btoa(JSON.stringify(message)), // base64 encode the message after json
					createdAt: Firebase.ServerValue.TIMESTAMP
				});
			},

			/**
			 * Unsubscribe the user from the topic
			 * @return {[type]} [description]
			 */
			unsubscribe: function() {
				this.$destroy();
			},

			$$added: function(snapshot) {

				snapshot.$id = snapshot.key(); // Must have this or further events won't trigger
				snapshot.$priority = snapshot.getPriority();

				if (this.$subscriptions.length !== 0) {
					// Get a copy of what the previous data was
					var oldData = angular.extend({}, this.updatedData);

					// update the current Data
					this.updatedData = snapshot.val();
					
					// If the data is the same then continue
					if (angular.equals(this.updatedData, oldData)) {
						return snapshot;
					}

					//
					// Get to work on notifying subscribers
					//
					var ref = snapshot.ref();
					var messageId = snapshot.key(); // messageId / firebase key
					var subject = this.updatedData.subject; // subject
					var message = JSON.parse(atob(this.updatedData.message)); // decode the base64 message and run through JSON

					// Iterate over the callbacks for the topic
					angular.forEach(this.$subscriptions, function(subscriber) {

						if (subscriber.subject === null || subscriber.subject == subject) {
							subscriber.callback.call(null, subject, message, messageId); // execute the registered callbacks	
						}
						
					});

				}

				return snapshot;
			},


			/**
			 * Fired when the Firebase object gets updated
			 * @param  {[type]} snapshot [description]
			 * @return {[type]}      [description]
			 */
			$$updated: function(snapshot) {			
				// return as usual
				return snapshot;
			}
		});


		return {
			topic: function(topicPath) {
				// Get an instance of the noticiation class for the topic path
				return new Notification(queueRef.child(topicPath));
			}
		};
	}]);})( window, window.angular );