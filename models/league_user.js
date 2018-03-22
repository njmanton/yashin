// jshint node: true, esversion: 6
'use strict';

const league_user = (sequelize, DataTypes) => {
  return sequelize.define('league_user', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    league_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    confirmed: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'league_user',
    freezeTableName: true
  });
};

module.exports = league_user;