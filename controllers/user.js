const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');
const GA = require('../util/getGA');
const snq = require('../util/searchNQ');
const mailer = require('../util/mailer.js');
const ES = require('../util/es.js');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/login', {
        title: 'Login'
    });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/login');
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('errors', info);
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', {
                msg: 'Success! You are logged in.'
            });
            res.redirect(req.session.returnTo || '/');
        });
    })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logout();
    res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/signup', {
        title: 'Create Account'
    });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/signup');
    }

    const user = new User({
        email: req.body.email,
        password: req.body.password
    });

    User.findOne({
        email: req.body.email
    }, (err, existingUser) => {
        if (err) {
            return next(err);
        }
        if (existingUser) {
            req.flash('errors', {
                msg: 'Account with that email address already exists.'
            });
            return res.redirect('/signup');
        }
        user.save((err) => {
            if (err) {
                return next(err);
            }
            ES.indexUser(user);
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    res.render('account/profile', {
        title: 'Account Management'
    });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
    req.assert('email', 'Please enter a valid email address.').isEmail();
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user.email = req.body.email || '';
        user.profile.name = req.body.name || '';
        user.profile.gender = req.body.gender || '';
        user.profile.location = req.body.location || '';
        user.profile.website = req.body.website || '';
        user.save((err) => {
            if (err) {
                if (err.code === 11000) {
                    req.flash('errors', {
                        msg: 'The email address you have entered is already associated with an account.'
                    });
                    return res.redirect('/account');
                }
                return next(err);
            }
            ES.indexUser(user);
            req.flash('success', {
                msg: 'Profile information has been updated.'
            });
            res.redirect('/account');
        });
    });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user.password = req.body.password;
        user.save((err) => {
            if (err) {
                return next(err);
            }
            ES.indexUser(user);
            req.flash('success', {
                msg: 'Password has been changed.'
            });
            res.redirect('/account');
        });
    });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
    User.remove({
        _id: req.user.id
    }, (err) => {
        if (err) {
            return next(err);
        }
        req.logout();
        req.flash('info', {
            msg: 'Your account has been deleted.'
        });
        res.redirect('/');
    });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
    const provider = req.params.provider;
    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user[provider] = undefined;
        user.tokens = user.tokens.filter(token => token.kind !== provider);
        user.save((err) => {
            if (err) {
                return next(err);
            }
            ES.indexUser(user);
            req.flash('info', {
                msg: `${provider} account has been unlinked.`
            });
            res.redirect('/account');
        });
    });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    User
        .findOne({
            passwordResetToken: req.params.token
        })
        .where('passwordResetExpires').gt(Date.now())
        .exec((err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                req.flash('errors', {
                    msg: 'Password reset token is invalid or has expired.'
                });
                return res.redirect('/forgot');
            }
            res.render('account/reset', {
                title: 'Password Reset'
            });
        });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirm', 'Passwords must match.').equals(req.body.password);

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('back');
    }

    async.waterfall([
        function(done) {
            User
                .findOne({
                    passwordResetToken: req.params.token
                })
                .where('passwordResetExpires').gt(Date.now())
                .exec((err, user) => {
                    if (err) {
                        return next(err);
                    }
                    if (!user) {
                        req.flash('errors', {
                            msg: 'Password reset token is invalid or has expired.'
                        });
                        return res.redirect('back');
                    }
                    user.password = req.body.password;
                    user.passwordResetToken = undefined;
                    user.passwordResetExpires = undefined;
                    user.save((err) => {
                        if (err) {
                            return next(err);
                        }
                        req.logIn(user, (err) => {
                            done(err, user);
                        });
                        ES.indexUser(user);
                    });
                });
        },
        function(user, done) {
            const transporter = nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USER,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: 'hello@f42labs.io',
                subject: 'Your GrowthHacker password has been changed',
                text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash('success', {
                    msg: 'Success! Your password has been changed.'
                });
                done(err);
            });
        }
    ], (err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('account/forgot', {
        title: 'Forgot Password'
    });
};

/**
 * GET /usersmongo
 * List all Users.
 */
exports.getUsersMongo = (req, res) => {
    User.find((err, docs) => {
        console.log("Mongo Users are: " + + JSON.stringify(docs, null, 2));
        res.render('users', {
            users: docs
        });
    });
};

//Get Users Elastic Version
//GET /users
exports.getUsers = (req, res) => {
    ES.searchAll('users', 'user', function(_docs) {
        //console.log("Users are:" + JSON.stringify(_docs, null, 2));
        var docs = convertES2ModelSimple(_docs.hits);
        //console.log("Response is :" + JSON.stringify(docs, null, 2));
        res.render('users', {
            users: docs
        });
    });
};

//Get Users Elastic Version
//GET /users/id/reload
exports.getreloadBrandAndGA = (req, res) => {
    var email = req.params.userId;
    ES.searchUserById('users', 'user', email, function(_docs) {
        var docs = convertES2ModelSimple(_docs.hits);
        //console.log("User is :" + JSON.stringify(docs, null, 2));
        if (docs != 'undefined' && docs.length > 0) {
            for (var i = 0; i < docs.length; i++) {
                var tokens = docs[i].tokens;
                console.log("User tokens are:" + JSON.stringify(tokens));
                for (var j = 0; j < tokens.length; j++) {
                    //console.log('Token is:', docs[i].tokens[j].accessToken);
                    //console.log('Kind is:', docs[i].tokens[j].kind);
                    var uEmail = docs[i].email;
                    if (docs[i].tokens[j].kind.toString() == 'google#analytics#access_token') {
                        var aToken = docs[i].tokens[j].accessToken;
                        if (docs[i].tokens[j + 1].kind.toString() == 'google#analytics#refresh_token')
                            var rToken = docs[i].tokens[j + 1].refreshToken;
                        if (aToken && rToken) {
                            //get refreshed tokens
                            GA.refreshOauth2Token(aToken, rToken, function(responseTokenSet) {
                                var oauth2Client = responseTokenSet;
                                //console.log("Fetching brands/accounts for: " + uEmail + " : accessToken :" + oauth2Client.credentials.access_token + " refreshToken :" + oauth2Client.credentials.refresh_token);
                                GA.getGA(oauth2Client.credentials.access_token, oauth2Client.credentials.refresh_token, uEmail);
                            });
                        } else {
                            console.log("Error fetching access & Refresh Token...!");
                        }
                    }
                }
            }
        }


        //flash message
        req.flash('success', {
            msg: 'User ' + docs[0].profile.name + ' with ID ' + docs[0].email + ' has been scheduled for Reload brands and GA!'
        });
        res.render('users', {
            users: docs
        });
    });
};

/**
 * GET /loadBrandsAndGA
 * Load a test case for all brands attached to info.
 */
exports.getloadBrandsAndGA = (req, res) => {
    User.find((err, docs) => {
        // Iterate through all accounts that have google analytics accounts
        // and call load GA
        if (docs != 'undefined' && docs.length > 0) {
            for (var i = 0; i < docs.length; i++) {
                var tokens = docs[i].tokens;
                //console.log("User tokens are:" + JSON.stringify(tokens));
                for (var j = 0; j < tokens.length; j++) {
                    //console.log('Token is:', docs[i].tokens[j].accessToken);
                    //console.log('Kind is:', docs[i].tokens[j].kind);
                    var uEmail = docs[i].email;
                    if (docs[i].tokens[j].kind.toString() == 'google#analytics#access_token') {
                        var aToken = docs[i].tokens[j].accessToken;
                        if (docs[i].tokens[j + 1].kind.toString() == 'google#analytics#refresh_token')
                            var rToken = docs[i].tokens[j + 1].refreshToken;
                        if (aToken && rToken) {
                            //get refreshed tokens
                            GA.refreshOauth2Token(aToken, rToken, function(responseTokenSet) {
                                var oauth2Client = responseTokenSet;
                                //console.log("Fetching brands/accounts for: " + uEmail + " : accessToken :" + oauth2Client.credentials.access_token + " refreshToken :" + oauth2Client.credentials.refresh_token);
                                GA.getGA(oauth2Client.credentials.access_token, oauth2Client.credentials.refresh_token, uEmail);
                            });
                        } else {
                            console.log("Error fetching access & Refresh Token...!");
                        }
                    }
                }
            }
        }
        //After done, just respond with a render to user page      
        //res.redirect('/users');
        snq.reEnqueue();
        mailer.sendEmailMessage();
        res.sendStatus(200);
    });
};


/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
    req.assert('email', 'Please enter a valid email address.').isEmail();
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/forgot');
    }

    async.waterfall([
        function(done) {
            crypto.randomBytes(16, (err, buf) => {
                const token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({
                email: req.body.email
            }, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    req.flash('errors', {
                        msg: 'Account with that email address does not exist.'
                    });
                    return res.redirect('/forgot');
                }
                user.passwordResetToken = token;
                user.passwordResetExpires = Date.now() + 3600000; // 1 hour
                user.save((err) => {
                    done(err, token, user);
                });
                ES.indexUser(user);
            });
        },
        function(token, user, done) {
            const transporter = nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USER,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: 'hello@f42labs.com',
                subject: 'Reset your password on GrowthHacker.io',
                text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash('info', {
                    msg: `An e-mail has been sent to ${user.email} with further instructions.`
                });
                done(err);
            });
        }
    ], (err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/forgot');
    });
};

function convertES2ModelSimple(hits) {
    //console.log("convertES2Model: hitCount " + hits.length);
    var brands = [];
    for (var i = 0; i < hits.length; i++) {
        brands.push(hits[i]._source);
        //console.log (JSON.stringify(hits[i]._source, null, 2))
    }
    return brands;
}