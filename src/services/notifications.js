angular.module('ngFirebaseNotifications')
	.service('ngFirebaseNotifications', ['ngFirebaseNotificationsConfig', '$firebaseArray', function ngFirebaseNotifications(ngFirebaseNotificationsConfig, $firebaseArray) {
		
		// Variables
		var firebaseUrl = ngFirebaseNotificationsConfig.get('firebaseUrl');
		var firbaseQueueBase = ngFirebaseNotificationsConfig.get('firbaseQueueBase');
		var queueRef = new Firebase(firebaseUrl).child(firbaseQueueBase);

		var topics = [];
		var oldData = {}; // move into Notification Class

		// Classes
		var Notification = $firebaseArray.$extend({

			publish: function(subject, message) {
				// todo: add uid?
				this.$add({
					subject: subject,
					message: btoa(JSON.stringify(message)), // base64 encode the message after json
					createdAt: Firebase.ServerValue.TIMESTAMP
				});
			},

			$$added: function(snapshot) {
				snapshot.$id = snapshot.key(); // Must have this or further events won't trigger
				snapshot.$priority = snapshot.getPriority();

				return snapshot;
			},


			/**
			 * Fired when the Firebase object gets updated
			 * @param  {[type]} snapshot [description]
			 * @return {[type]}      [description]
			 */
			$$updated: function(snapshot) {
				var val = snapshot.val();
				
				// Not an update. continue
				if (angular.equals(val, oldData)) {
					oldData = val;
					return snapshot;
				}

				oldData = val; // set for matching

				//
				// Get to work on notifying subscribers
				//
				var ref = snapshot.ref();
				var topic = '';

				// go over the path pieces
				angular.forEach(ref.path.pieces_, function(piece){
					topic += piece + '/'; //append
				});
				topic = topic.replace('/'+snapshot.key()+'/', ''); // remove the item key

				// If subscribers, execute callbacks
				if (topics[topic]) {
					var messageId = snapshot.key(); // messageId / firebase key
					var subject = val.subject; // subject
					var message = JSON.parse(atob(val.message)); // decode the base64 message and run through JSON

					// Iterate over the callbacks for the topic
					angular.forEach(topics[topic].subscribers, function(callback) {
						callback.call(null, messageId, subject, message); // execute the registered callbacks
					});
				}

				// return as usual
				return snapshot;
			}
		});

		var Topic = function() {
		};

		Topic.prototype.init = function(topic) {
			var self = this;

			// If topic hasn't been subscribed to yet
			if (!angular.isObject(topics[topic])) {
				topics[topic] = {
					channel: new Notification(queueRef.child(topic)),
					subscribers: []
				}; // init new topic
			}

			return true;
		};

		Topic.prototype.subscribe = function(topic, callback) {
			this.init(topic);

			// Register callbacks for topic
			topics[topic].subscribers.push(callback);
		};

		Topic.prototype.publish = function(topic, subject, message) {
			this.init(topic);

			// Push the message
			topics[topic].channel.publish(subject, message);
		};


		// Return the service methods
		return {

			/**
			 * Subscribe to a topic and have messages sent to the registred callback
			 * callback(messageId, subject, message)
			 * @param  {String}   topic    The path in firebase where you want to listen
			 * @param  {Function} callback [description]
			 * @return {[type]}            [description]
			 */
			subscribe: function(topic, callback) {
				var topicMethod = new Topic();
				topicMethod.subscribe(topic, callback);
				return true;
			},


			/**
			 * Unsubscribe
			 * @param  {[type]} topic [description]
			 * @return {Boolean}       Returns true if the topic was unsubbed, returns false if topic didn't exist
			 */
			unsubscribe: function(topic) {
				var keys = Object.keys(subscriptions); // get a list of topics
				var idx = keys.indexOf(topic); // get the list index for the topic

				// topic exists
				if (idx !== -1) {
					subscriptions.splice(idx, 1); // remove topic from list
					return true;
				}

				return false;
			},


			/**
			 * Publish to a topic
			 * @param  {[type]} topic   [description]
			 * @param  {[type]} subject [description]
			 * @param  {[type]} message [description]
			 * @return {[type]}         [description]
			 */
			publish: function(topic, subject, message) {
				var topicMethod = new Topic();
				topicMethod.publish(topic, subject, message);
			}
		};
	}]);