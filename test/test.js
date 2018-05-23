/* eslint-env mocha */
'use strict';

const request = require('supertest'),
      utils   = require('../utils'),
      expect  = require('chai').expect,
      api     = request('http://localhost:1960');

const credentials = {
  user: 'testuser',
  password: 'testuser'
};

describe('information at root directory of server',
  () => {
  it('is connecting locally', done => {
  // pass in our server to supertest
  api
    .get('/')
    // test passes if statusCode is 200
    .end((err, res) => {
      expect(res.status).to.equal(200);
      done();
    });
  });

});

describe('User', () => {
  it('Should return a 200 response for User 1', done => {
    api.get('/users/1')
       .end((err, res) => {
          expect(res.status).to.equal(200);
          done();
        });
  });

  it('Should redirect to /login page for an authenticated route', done => {
    api.get('/home')
       .end((err, res) => {
          expect(res.status).to.equal(302);
          done();
        });
  });

  it('Should login user and redirect to /home', done => {
    api.get('/login')
       .send(credentials)
       .end((err, res) => {
         expect(res.status).to.equal(200);
         done();
       });
  });

  it('Should return a not found response for invalid user', done => {
    api.get('/users/1234')
       .end((err, res) => {
         expect(res.status).to.equal(404);
         done();
       });
  });

  it('Should return a 200 response for Forgot', done => {
    api.get('/users/forgot')
       .end((err, res) => {
         expect(res.status).to.equal(200);
         done();
       });
  });

  it('Should give an array of leagues for user 1', done => {
    api.get('/users/1/leagues')
       .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        done();
       });
  });

  it('Should accept "xyz123" as available username', done => {
    api.get('/users/available/xyz123')
       .end((err, res) => {
         expect(res.status).to.equal(200);
         expect(res.body).to.be.true;
         done();
       });
  });

    it('Should reject "nick" as available username', done => {
    api.get('/users/available/nick')
       .end((err, res) => {
         expect(res.status).to.equal(200);
         expect(res.body).to.be.false;
         done();
       });
  });
});

describe('League', function() {
  it('Should return a 200 response for index', done => {
    api.get('/leagues/')
       .end((err, res) => {
         expect(res.status).to.equal(200);
         done();
       });
  });

  it('Should return a 200 response for valid league', done => {
    api.get('/leagues/1')
       .end((err, res) => {
         expect(err).to.not.exist;
         expect(res.status).to.equal(200);
         done();
       });
  });

  it('Should return a not found response for invalid league', done => {
      api.get('/leagues/1234')
         .end((err, res) => {
            expect(res.status).to.equal(404);
            done();
         });
  });

  // it('Should return a JSON object for a pending leagues request', done => {
  //   request(url)
  //     .get('/leagues/pending')
  //     .expect(200)
  //     .end(function(err, res) {
  //       expect(res.body[0]).to.have.property('id')
  //       expect(err).to.not.exist;
  //       done()
  //     })
  // })

//   it('Should return a JSON object for a pending players request', function(done) {
//     request(url)
//       .get('/leagues/1/pending')
//       .expect(200)
//       .end(function(err, res) {
//         expect(err).to.not.exist;
//         done()
//       })
//   })
});

describe('Venue', () => {
  it('Should serve a page for all venues', done => {
    api.get('/venues/').end((err, res) => {
      expect(res.status).to.equal(200);
      done();
    });
  });

  it('Should serve a page for a specific venue', done => {
    api.get('/venues/1').end((err, res) => {
      expect(res.status).to.equal(200);
      done();
    });
  });

  it('Should server a 404 page for an invalid venue', done => {
    api.get('/venues/9999').end((err, res) => {
      expect(res.status).to.equal(404);
      done();
    });
  });
});

describe('Match', () => {
  it('Should serve a page for all matches', done => {
    api.get('/matches/').end((err, res) => {
      expect(res.status).to.equal(200);
      done();
    });
  });

  it('Should serve a page for a specific match', done => {
    api.get('/matches/1').end((err, res) => {
      expect(res.status).to.equal(200);
      done();
    });
  });

  it('Should serve a 404 for an invalid match', done => {
    api.get('/matches/9999').end((err, res) => {
      expect(res.status).to.equal(404);
      done();
    });
  });

});

describe('Score Calcs', () => {
  it('Should calculate incorrect prediction as zero', done => {
    let calc = utils.calc('2-1', '0-1', 0, 0);
    expect(calc).to.equal(0);
    done();
  });

  it('Should calculate right prediction', done => {
    let calc = utils.calc('2-1', '2-1', 0, 0);
    expect(calc).to.equal(5);
    done();
  });

  it('Should calculate right result as one', done => {
    let calc = utils.calc('2-1', '3-1', 0, 0);
    expect(calc).to.equal(1);
    done();
  });

  it('Should calculate right goal difference as three', done => {
    let calc = utils.calc('2-1', '1-0', 0, 0);
    expect(calc).to.equal(3);
    done();
  });

  it('Should calculate joker prediction as 10', done => {
    let calc = utils.calc('2-1', '2-1', 1, 0);
    expect(calc).to.equal(10);
    done();
  });

  it('Should calculate joker right result as 2', done => {
    let calc = utils.calc('2-1', '5-1', 1, 0);
    expect(calc).to.equal(2);
    done();
  });

  it('Should calculate incorrect joker as -1', done => {
    let calc = utils.calc('2-1', '0-1', 1, 0);
    expect(calc).to.equal(-1);
    done();
  });

  it('Should return zero for invalid prediction', done => {
    let calc = utils.calc('A-1', '0-1', 0, 0);
    expect(calc).to.equal(0);
    done();
  });

  it('Should return zero for no prediction', done => {
    let calc = utils.calc(null, '0-1', 0, 0);
    expect(calc).to.equal(0);
    done();
  });

});

describe('Valid Scores', () => {
  it('Should return true for a valid score', done => {
    let validScore = utils.validScore('1-1');
    expect(validScore).to.be.true;
    done();
  });

  it('Should return false for an invalid score', done => {
    let validScore = utils.validScore(null);
    expect(validScore).to.be.false;
    done();
  });

});

