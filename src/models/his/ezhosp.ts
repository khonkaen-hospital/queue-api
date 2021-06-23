import * as knex from 'knex';
import { customAlphabet } from 'nanoid';
import * as moment from 'moment';
var request = require("request");
export class EzhospModel {

	getTodayReport(db: knex) {
		const sql = `
		select
		count(vn) as total,
		((60*60*8) / count(vn)) as avg,
		sum(if(is_auto_queuenumber=0,1,0)) as manual,
		sum(if(is_auto_queuenumber=1,1,0)) as auto
		from (
			select
			d.hn,
			d.vn,
			d.is_auto_queuenumber
			from hospdata.pharmacy_opd_drug_robot d
			inner join hospdata.pharmacy_opd_drug_pay p on p.code_pay = d.codepay
			where date(d.request_datetime) = current_date()
			and p.location = 'OPD11'
			group by hn, vn
		) as report
		`;
		return db.raw(sql);
	}

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

	getPharmacyRobotQueueByVn(db: knex, vn: string, dateServ: string) {
		return db('pharmacy_opd_drug_robot')
			.select('pharmacy_opd_drug_robot.*', 'patient.title', 'patient.name', 'patient.surname')
			.innerJoin('patient', 'patient.hn', 'pharmacy_opd_drug_robot.hn')
			.whereRaw('date(request_datetime) = ?', [dateServ])
			.where({ vn: vn })
			.orderBy('request_datetime', 'DESC');
	}

	getCurrentVisit(db: knex, hn) {
		return [];
	}

	checkRobotQueueStatus(data) {
		return new Promise((resolve: any, reject: any) => {
			var options = {
				method: 'POST',
				url: 'http://192.168.15.245:3030/api/showstate',
				agentOptions: {
					rejectUnauthorized: false
				},
				headers: { 'content-type': 'application/json' },
				body: data
			};

			request(options, function (error, response, body) {
				if (error) {
					reject(error);
				} else {
					resolve(body);
				}
			});
		});
	}

	getQueueTodayIsExist(db: knex, queue_number: string, service_point_id: number = 12) {
		const date = moment().format('YYYY-MM-DD');
		return db('q4u_queue')
			.select('queue_number', 'queue_id', 'hn', 'vn', 'date_create')
			.where({
				queue_number: queue_number,
				date_serv: date,
				service_point_id: service_point_id
			}).first();
	}

	getRobotQueueTodayIsExist(db: knex, hn: string, vn: string, service_point_id: number = 12) {
		const date = moment().format('YYYY-MM-DD');
		console.log(date, hn, vn);
		return db('q4u_queue')
			.select('queue_number', 'queue_id')
			.where({
				hn: hn,
				vn: vn,
				date_serv: date,
				service_point_id: service_point_id
			}).first();
	}

	getRobotQueueToday(db: knex, queue_number: string) {
		const date = moment().format('YYYY-MM-DD');
		return db('q4u_queue')
			.select(db.raw('count(queue_number) as total'))
			.whereRaw('date_serv = curdate()')
			.where({
				queue_number: queue_number,
				service_point_id: 12
			}).first();
	}

	async generateQueueNumber(db: knex, i: number = 1) {
		const nanoid = customAlphabet('123456789', 4);
		const queueUniqueNumber = nanoid();
		const queueIsExists = await this.getRobotQueueToday(db, queueUniqueNumber);
		if (queueIsExists.total > 0) {
			//console.log('duplicate', queueUniqueNumber, i);
			return this.generateQueueNumber(db, i++);
		} else {
			return queueUniqueNumber;
		}
	}

	rendom() {
		const nanoid = customAlphabet('123456789', 4);
		return nanoid();
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

	getVisitListRobotByHn(db: knex, hn: string) {
		return db('view_opd_visit as o')
			.select('o.vn', 'o.hn', db.raw('o.date as date_serv'), db.raw('o.time as time_serv'),
				'o.dep as clinic_code', 'o.dep_name as clinic_name',
				'o.title', 'o.name as first_name', 'o.surname as last_name',
				'o.birth as birthdate', 'o.sex', 'o.queue as his_queue')
			.whereRaw('o.date = current_date()')
			.where({ hn: hn });
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
