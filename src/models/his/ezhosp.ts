import * as knex from 'knex';
import { customAlphabet } from 'nanoid';
import * as moment from 'moment';
export class EzhospModel {

	getPatientInfo(db: knex, cid: any) {
		return db('patient')
			.select('hn', 'name as first_name', 'title', 'sex', 'surname as last_name', 'birth as birthdate')
			.where('no_card', cid).limit(1);
	}

	getPatientInfoWithHN(db: knex, hn: any) {
		return db('patient')
			.select('hn', 'name as first_name', 'title', 'sex', 'surname as last_name', 'birth as birthdate')
			.where('hn', hn).limit(1);
	}

	getPharmacyRobotQueue(db: knex, dateServ: string) {
		return db('pharmacy_opd_drug_robot')
			.select('pharmacy_opd_drug_robot.*', 'patient.title', 'patient.name', 'patient.surname')
			.innerJoin('patient', 'patient.hn', 'pharmacy_opd_drug_robot.hn')
			.whereRaw('date(request_datetime) = ?', [dateServ])
			.orderBy('request_datetime', 'DESC');
	}

	getCurrentVisit(db: knex, hn) {
		return [];
	}

	getRobotQueueToday(db: knex) {
		const date = moment().format('YYYY-MM-DD');
		return db('q4u_queue')
			.select('queue_number')
			.where({
				date_serv: date,
				service_point_id: 12
			});
	}

	getRobotQueueTodayIsExist(db: knex, hn: string, vn: string) {
		const date = moment().format('YYYY-MM-DD');
		console.log(date, hn, vn);
		return db('q4u_queue')
			.select('queue_number', 'queue_id')
			.where({
				hn: hn,
				vn: vn,
				date_serv: date,
				service_point_id: 12
			}).first();
	}

	async generateQueueNumber(db: knex) {
		let queueToday = await this.getRobotQueueToday(db);
		let queuenumber: Array<any> = queueToday.map(v => v.queue_number);
		return this.rendom(db, queuenumber);
	}

	rendom(db, queuenumber: Array<any>) {
		const nanoid = customAlphabet('123456789', 4);
		let queueUniqueNumber = nanoid();
		if (queuenumber.some(n => n === queueUniqueNumber)) {
			return this.rendom(db, queuenumber);
		} else {
			return queueUniqueNumber;
		}
	}

	getVisitListRobot(db: knex, dateServ: any, query: any, localCode: any[], vn: any[], servicePointCode: any, limit: number = 20, offset: number = 0) {
		var sql = db('view_opd_visit as o')
			.select('o.vn', 'o.hn', db.raw('o.date as date_serv'), db.raw('o.time as time_serv'),
				'o.dep as clinic_code', 'o.dep_name as clinic_name',
				'o.title', 'o.name as first_name', 'o.surname as last_name',
				'o.birth as birthdate', 'o.sex', 'o.queue as his_queue')
			.where('o.date', dateServ);
		// .whereNotIn('o.vn', vn);

		if (query) {
			var _arrQuery = query.split(' ');
			var firstName = null;
			var lastName = null;

			if (_arrQuery.length === 2) {
				firstName = `${_arrQuery[0]}%`;
				lastName = `${_arrQuery[1]}%`;
			}

			sql.where(w => {
				var _where = w.where('o.hn', query);
				if (firstName && lastName) {
					_where.orWhere(x => x.where('o.name', 'like', firstName).where('o.surname', 'like', lastName))
				}
				return _where;
			});

		} else {
			if (servicePointCode) {
				sql.where('o.to_dep', servicePointCode);
			}
		}

		return sql.limit(limit)
			.offset(offset)
			.orderBy('o.time', 'asc');

	}

	getVisitTotalRobot(db: knex, dateServ: any, query: any, localCode: any[], vn: any[], servicePointCode: any) {
		var sql = db('view_opd_visit as o')
			.select(db.raw('count(1) as total'))
			.where('o.date', dateServ)
			.whereNotIn('o.vn', vn);

		if (query) {
			var _arrQuery = query.split(' ');
			var firstName = null;
			var lastName = null;

			if (_arrQuery.length === 2) {
				firstName = `${_arrQuery[0]}%`;
				lastName = `${_arrQuery[1]}%`;
			}

			sql.where(w => {
				var _where = w.where('o.hn', query);
				if (firstName && lastName) {
					_where.orWhere(x => x.where('o.name', 'like', firstName).where('o.surname', 'like', lastName))
				}
				return _where;
			});

		} else {
			if (servicePointCode) {
				sql.where('o.to_dep', servicePointCode);
			}
		}

		return sql.orderBy('o.dep', 'asc');
	}

	getVisitList(db: knex, dateServ: any, localCode: any[], vn: any[], servicePointCode: any, query: any, limit: number = 20, offset: number = 0) {
		var sql = db('view_opd_visit as o')
			.select('o.vn', 'o.hn', db.raw('o.date as date_serv'), db.raw('o.time as time_serv'),
				'o.dep as clinic_code', 'o.dep_name as clinic_name',
				'o.title', 'o.name as first_name', 'o.surname as last_name',
				'o.birth as birthdate', 'o.sex', 'o.queue as his_queue')
			.where('o.date', dateServ)
			.whereIn('o.to_dep', localCode)
			.whereNotIn('o.vn', vn);

		if (query) {
			var _arrQuery = query.split(' ');
			var firstName = null;
			var lastName = null;

			if (_arrQuery.length === 2) {
				firstName = `${_arrQuery[0]}%`;
				lastName = `${_arrQuery[1]}%`;
			}

			sql.where(w => {
				var _where = w.where('o.hn', query);
				if (firstName && lastName) {
					_where.orWhere(x => x.where('o.name', 'like', firstName).where('o.surname', 'like', lastName))
				}
				return _where;
			});

		} else {
			if (servicePointCode) {
				sql.where('o.to_dep', servicePointCode);
			}
		}

		return sql.limit(limit)
			.offset(offset)
			.orderBy('o.time', 'asc');

	}

	getVisitTotal(db: knex, dateServ: any, localCode: any[], vn: any[], servicePointCode: any, query: any) {
		var sql = db('view_opd_visit as o')
			.select(db.raw('count(1) as total'))
			.where('o.date', dateServ)
			.whereIn('o.to_dep', localCode)
			.whereNotIn('o.vn', vn);

		if (query) {
			var _arrQuery = query.split(' ');
			var firstName = null;
			var lastName = null;

			if (_arrQuery.length === 2) {
				firstName = `${_arrQuery[0]}%`;
				lastName = `${_arrQuery[1]}%`;
			}

			sql.where(w => {
				var _where = w.where('o.hn', query);
				if (firstName && lastName) {
					_where.orWhere(x => x.where('o.name', 'like', firstName).where('o.surname', 'like', lastName))
				}
				return _where;
			});

		} else {
			if (servicePointCode) {
				sql.where('o.to_dep', servicePointCode);
			}
		}

		return sql.orderBy('o.dep', 'asc');
	}

	getVisitHistoryList(db: knex, dateServ: any, localCode: any[], vn: any[], servicePointCode: any, query: any, limit: number = 20, offset: number = 0) {
		var sql = db('view_opd_visit as o')
			.select('o.vn', 'o.hn', db.raw('o.date as date_serv'), db.raw('o.time as time_serv'),
				'o.dep as clinic_code', 'o.dep_name as clinic_name',
				'o.title', 'o.name as first_name', 'o.surname as last_name',
				'o.birth as birthdate', 'o.sex', 'o.queue as his_queue')
			.where('o.date', dateServ)
			.whereIn('o.to_dep', localCode)
			.whereIn('o.vn', vn);

		if (query) {
			var _arrQuery = query.split(' ');
			var firstName = null;
			var lastName = null;

			if (_arrQuery.length === 2) {
				firstName = `${_arrQuery[0]}%`;
				lastName = `${_arrQuery[1]}%`;
			}

			sql.where(w => {
				var _where = w.where('o.hn', query);
				if (firstName && lastName) {
					_where.orWhere(x => x.where('o.name', 'like', firstName).where('o.surname', 'like', lastName))
				}
				return _where;
			});

		} else {
			if (servicePointCode) {
				sql.where('o.to_dep', servicePointCode);
			}
		}

		return sql.limit(limit)
			.offset(offset)
			.orderBy('o.time', 'asc');
	}

	getVisitHistoryTotal(db: knex, dateServ: any, localCode: any[], vn: any[], servicePointCode: any, query: any) {
		var sql = db('view_opd_visit as o')
			.select(db.raw('count(1) as total'))
			.where('o.date', dateServ)
			.whereIn('o.to_dep', localCode)
			.whereIn('o.vn', vn);

		if (query) {
			var _arrQuery = query.split(' ');
			var firstName = null;
			var lastName = null;

			if (_arrQuery.length === 2) {
				firstName = `${_arrQuery[0]}%`;
				lastName = `${_arrQuery[1]}%`;
			}

			sql.where(w => {
				var _where = w.where('o.hn', query);
				if (firstName && lastName) {
					_where.orWhere(x => x.where('o.name', 'like', firstName).where('o.surname', 'like', lastName))
				}
				return _where;
			});

		} else {
			if (servicePointCode) {
				sql.where('o.to_dep', servicePointCode);
			}
		}

		return sql.orderBy('o.dep', 'asc');
	}

}
