
const Brand = require('../models/Brand.js');

exports.getBrandByBrandId = (req, res) => {
	var brandId = req.params.brandId;
	console.log("Brand being edited with " + brandId);
  Brand.findOne({ AccountID: brandId}, function(err, docs) {
  	//console.log(docs);
  	//convert array to string
    res.render('brandDetail', { brand: docs });
  });
};

/**
 * GET /brands
 * List all Brands.
 */
exports.getBrands = (req, res) => {
  Brand.find((err, docs) => {
    res.render('brands', { brands: docs });
  });
};

/**
 * POST /brands/:brandId/profile
 * Update brand information.
 */
exports.postUpdateBrand = (req, res, next) => {
  const errors = req.validationErrors();
	var brandId = req.params.brandId;
	console.log("Brand being updated with " + brandId);
    if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  Brand.findOne({ AccountID: brandId}, function(err, brand) {
    if (err) { return next(err); }
    brand.oAuthUserEmail = req.body.useremail || '';
    brand.tags = req.body.tags;
    brand.save((err) => {
      if (err) {
      	console.log(err);
        return next(err);
      }
      req.flash('success', { msg: 'Brand information has been updated!' });
      res.redirect('/brands');
    });
  });
};
