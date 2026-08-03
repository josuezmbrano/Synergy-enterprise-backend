import { MemberEntityClass } from 'core/entities/classes/member-entity.class.js';
import { MemberProps } from 'core/entities/props/member.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { MemberIdVo } from 'core/value-objects/common/identifiers/member-id.vo.js';
import { ProjectIdVo } from 'core/value-objects/common/identifiers/project-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { MemberRoleVo } from 'core/value-objects/member/member-role.vo.js';
import { MemberStatusVo } from 'core/value-objects/member/member-status.vo.js';

export class MemberMother {

    static createDefault(overrides?: Partial<MemberProps>) {

        const defaults = {
            publicId: MemberIdVo.create(),
            projectId: ProjectIdVo.create(),
            userId: UserIdVo.create(),
            role: MemberRoleVo.create('contributor'),
            status: MemberStatusVo.create('active'),
            joinedAt: DateVo.create(),
            ...overrides
        }

        return MemberEntityClass.create(defaults, MemberIdVo.create())
    }

    static reconstituteDefault(overrides?: Partial<MemberProps>) {

        const defaults = {
            publicId: MemberIdVo.create(),
            projectId: ProjectIdVo.create(),
            userId: UserIdVo.create(),
            role: MemberRoleVo.create('contributor'),
            status: MemberStatusVo.create('active'),
            joinedAt: DateVo.create(),
            ...overrides
        }

        return MemberEntityClass.reconstitute(
            defaults,
            MemberIdVo.fromId('550e8400-e29b-41d4-a716-446655440000'),
            DateVo.create(),
            DateVo.create(),
            UserIdVo.fromId('a4d9c1e2-b8f9-4c1d-8a5b-9d7e6f5a4c3b')
        )
    }

    static reconstituteAdmin() {
        return this.reconstituteDefault({
            role: MemberRoleVo.create('admin')
        })
    }

    static reconstituteOnLeave() {
        return this.reconstituteDefault({
            status: MemberStatusVo.create('on_leave')
        })
    }

    static reconstituteInactive() {
        return this.reconstituteDefault({
            status: MemberStatusVo.create('inactive')
        })
    }

}