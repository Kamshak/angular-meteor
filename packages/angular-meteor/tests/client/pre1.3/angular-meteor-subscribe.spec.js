import 'angular-meteor';

import {chai} from 'meteor/practicalmeteor:chai';
import {sinon} from 'meteor/practicalmeteor:sinon';

const expect = chai.expect;

describe('$meteorSubscribe service', function () {
  var $meteorSubscribe,
    $rootScope,
    $scope,
    ready,
    stop;

  var $subscriptionHandleMock = { stop: function () {stop();} };

  beforeEach(angular.mock.module('angular-meteor'));
  beforeEach(angular.mock.inject(function (_$meteorSubscribe_, _$rootScope_) {
    $meteorSubscribe = _$meteorSubscribe_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  beforeEach(function () {
    sinon.stub(Meteor, 'subscribe', function () {
      stop = arguments[arguments.length - 1].onStop;
      ready = arguments[arguments.length - 1].onReady;

      return $subscriptionHandleMock;
    });
  });

  afterEach(function() {
    Meteor.subscribe.restore();
  });

  describe('$scope.$meteorSubscribe', function () {

    it('should call Meteor.subscribe with publication arguments and event callbacks ', function () {
      $scope.$meteorSubscribe('subscription', 1, 2, 3);

      expect(Meteor.subscribe.calledWith('subscription', 1, 2, 3, {
          onReady: sinon.match.func,
          onStop: sinon.match.func
        })).to.be.true;
    });

    it('should return promise that is resolved when subscription is ready', function (done) {
      $scope.$meteorSubscribe('subscription', 1, 2, 3)
        .then(function (handle) {
          expect(handle).to.equal($subscriptionHandleMock);
        })
        .finally(done);

      ready();
      $rootScope.$digest();
    });

    it('should return promise that is rejected with a Meteor.Error', function (done) {
      var promise = $scope.$meteorSubscribe('subscription', 1, 2, 3);

      promise.catch(function (err) {
        expect(err).to.be.an.instanceof(Meteor.Error);
        done();
      });

      stop();
      $rootScope.$digest();
    });

  });

  describe('pass onStop argument', function () {

    it('should call Meteor.subscribe with only subscription arguments and event callback options', function () {
      $scope.$meteorSubscribe('subscription', 1, 2, 3, {onStop: function () {}});

      expect(Meteor.subscribe.calledWith('subscription', 1, 2, 3, {
          onReady: sinon.match.func,
          onStop: sinon.match.func
        })).to.be.true;
    });

    it('should call onStop with Meteor.Error when onStop event called for subscription that was resolved', function (done) {
      var error = new Meteor.Error('Error', 'reason');

      var onStop = _.once(function (err) {
        expect(err).to.equal(error);
        done();
      });

      $scope.$meteorSubscribe('subscription', 1, 2, 3,
        {
          onStop
        });

      ready();
      stop(error);
    });

    it('should call onStop when subscription is stopped', function (done) {
      var onStop = _.once(function (err) {
        expect(err).not.to.exist;
        done();
      });

      $scope.$meteorSubscribe('subscription', 1, 2, 3,
        {
          onStop
        });

      ready();
      stop();
    });
  });

  describe('$scope destroy', function () {
    var onStopSpy;

    beforeEach(function () {
      sinon.spy($subscriptionHandleMock, 'stop');
      onStopSpy = sinon.spy();
    });

    afterEach(function() {
      $subscriptionHandleMock.stop.restore();
    });

    it('should call Meteor.subscribe stop method on $destroy of scope', function () {
      $scope.$meteorSubscribe('subscription', 1, 2, 3);

      $scope.$destroy();
      expect($subscriptionHandleMock.stop.calledOnce).to.be.true;
    });

    it('should call onStop callback after subscription is resolved', function () {
      $scope.$meteorSubscribe('subscription', 1, 2, 3, {onStop: onStopSpy});

      ready();
      $scope.$destroy();
      expect($subscriptionHandleMock.stop.calledOnce).to.be.true;
      expect(onStopSpy.calledOnce).to.be.true;
    });

    it('should call onStop callback after subscription is rejected', function () {
      $scope.$meteorSubscribe('subscription', 1, 2, 3, {onStop: onStopSpy});

      stop();
      $scope.$destroy();
      expect($subscriptionHandleMock.stop.calledOnce).to.be.true;
      expect(onStopSpy.calledOnce).to.be.true;
    });

    it('should not call onStop callback if subscription was not resolved', function () {
      $scope.$meteorSubscribe('subscription', 1, 2, 3, {onStop: onStopSpy});

      $scope.$destroy();
      expect($subscriptionHandleMock.stop.calledOnce).to.be.true;
      expect(onStopSpy.calledOnce).to.be.false;
    });
  });
});
